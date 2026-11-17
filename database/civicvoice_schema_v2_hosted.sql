-- =========================================================
-- CIVICVOICE · Online Petition & Community Feedback Platform
-- Schema v2 (MySQL 8.0+)
-- Based on the TA schema; v2 adds:
--   * updated_at on petitions, admin_note on petitions/reports
--   * indexes for common filters
--   * distinct SQLSTATE codes in sp_sign_petition so the API can map
--     each failure to the right HTTP status
--   * duplicate signature handled inside the procedure (45409)
-- =========================================================

-- Hosted version: cloud MySQL providers give you one database and do not allow
-- DROP/CREATE DATABASE, so run this file inside the database they created.
-- It drops and recreates the tables, views and procedure.
DROP PROCEDURE IF EXISTS sp_sign_petition;
DROP VIEW IF EXISTS v_user_dashboard;
DROP VIEW IF EXISTS v_petition_summary;
DROP TABLE IF EXISTS content_reports, feedback, petition_comments, signatures, petitions, categories, users;

-- ---------- users ----------
CREATE TABLE users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    phone          VARCHAR(20),
    role           ENUM('user','admin') NOT NULL DEFAULT 'user',
    account_status ENUM('active','suspended') NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- categories ----------
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description   VARCHAR(255)
);

-- ---------- petitions ----------
CREATE TABLE petitions (
    petition_id        INT AUTO_INCREMENT PRIMARY KEY,
    creator_id         INT NOT NULL,
    category_id        INT NOT NULL,
    title              VARCHAR(200) NOT NULL,
    description        TEXT NOT NULL,
    problem_statement  TEXT,
    proposed_solution  TEXT,
    target_signatures  INT NOT NULL DEFAULT 100,
    status ENUM('draft','published','under_review','approved','rejected','closed')
                       NOT NULL DEFAULT 'published',
    location           VARCHAR(150),
    end_date           DATE,
    admin_note         VARCHAR(500),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id)  REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CHECK (target_signatures > 0),
    INDEX idx_petitions_status (status),
    INDEX idx_petitions_category (category_id),
    INDEX idx_petitions_created (created_at)
);

-- ---------- signatures (one per user per petition) ----------
CREATE TABLE signatures (
    signature_id INT AUTO_INCREMENT PRIMARY KEY,
    petition_id  INT NOT NULL,
    user_id      INT NOT NULL,
    signed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (petition_id) REFERENCES petitions(petition_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(user_id)         ON DELETE CASCADE,
    UNIQUE KEY uq_signature (petition_id, user_id),
    INDEX idx_signatures_user (user_id)
);

-- ---------- petition_comments ----------
CREATE TABLE petition_comments (
    comment_id     INT AUTO_INCREMENT PRIMARY KEY,
    petition_id    INT NOT NULL,
    user_id        INT NOT NULL,
    comment_text   TEXT NOT NULL,
    comment_status ENUM('visible','hidden','removed') NOT NULL DEFAULT 'visible',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (petition_id) REFERENCES petitions(petition_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(user_id)         ON DELETE CASCADE,
    INDEX idx_comments_petition (petition_id, comment_status)
);

-- ---------- feedback ----------
CREATE TABLE feedback (
    feedback_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT,
    subject         VARCHAR(150) NOT NULL,
    message         TEXT NOT NULL,
    rating          INT,
    feedback_status ENUM('new','reviewed','resolved') NOT NULL DEFAULT 'new',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

-- ---------- content_reports ----------
CREATE TABLE content_reports (
    report_id     INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id   INT NOT NULL,
    petition_id   INT,
    comment_id    INT,
    reason        VARCHAR(150) NOT NULL,
    details       TEXT,
    report_status ENUM('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
    admin_note    VARCHAR(500),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (petition_id) REFERENCES petitions(petition_id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id)  REFERENCES petition_comments(comment_id) ON DELETE CASCADE,
    CHECK ((petition_id IS NOT NULL AND comment_id IS NULL)
        OR (petition_id IS NULL AND comment_id IS NOT NULL)),
    INDEX idx_reports_status (report_status)
);

-- ---------- views ----------
CREATE VIEW v_petition_summary AS
SELECT
    p.petition_id, p.title, p.description, p.location, p.status,
    p.category_id, c.category_name,
    p.creator_id, u.full_name AS creator_name,
    p.target_signatures,
    COUNT(s.signature_id) AS total_signatures,
    ROUND(COUNT(s.signature_id) * 100.0 / p.target_signatures, 2) AS progress_percentage,
    p.end_date, p.created_at
FROM petitions p
JOIN users u      ON p.creator_id  = u.user_id
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN signatures s ON p.petition_id = s.petition_id
GROUP BY p.petition_id, p.title, p.description, p.location, p.status,
         p.category_id, c.category_name, p.creator_id, u.full_name,
         p.target_signatures, p.end_date, p.created_at;

CREATE VIEW v_user_dashboard AS
SELECT
    u.user_id, u.full_name, u.email, u.role,
    (SELECT COUNT(*) FROM petitions p         WHERE p.creator_id = u.user_id) AS petitions_created,
    (SELECT COUNT(*) FROM signatures s        WHERE s.user_id    = u.user_id) AS petitions_signed,
    (SELECT COUNT(*) FROM petition_comments c WHERE c.user_id    = u.user_id) AS comments_posted
FROM users u;

-- ---------- stored procedure ----------
-- SQLSTATE codes (API maps them to HTTP):
--   45403 user missing / not active   -> 403
--   45404 petition does not exist     -> 404
--   45400 petition closed or expired  -> 400
--   45409 already signed              -> 409
DELIMITER $$
CREATE PROCEDURE sp_sign_petition(IN p_user_id INT, IN p_petition_id INT)
BEGIN
    DECLARE v_status VARCHAR(30);
    DECLARE v_end_date DATE;
    DECLARE v_account_status VARCHAR(20);
    DECLARE EXIT HANDLER FOR 1062
        SIGNAL SQLSTATE '45409' SET MESSAGE_TEXT = 'You have already signed this petition';

    SELECT account_status INTO v_account_status FROM users WHERE user_id = p_user_id;
    IF v_account_status IS NULL THEN
        SIGNAL SQLSTATE '45403' SET MESSAGE_TEXT = 'User does not exist';
    ELSEIF v_account_status <> 'active' THEN
        SIGNAL SQLSTATE '45403' SET MESSAGE_TEXT = 'User account is not active';
    END IF;

    SELECT status, end_date INTO v_status, v_end_date FROM petitions WHERE petition_id = p_petition_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45404' SET MESSAGE_TEXT = 'Petition does not exist';
    ELSEIF v_status NOT IN ('published','approved') THEN
        SIGNAL SQLSTATE '45400' SET MESSAGE_TEXT = 'Petition is not open for signing';
    ELSEIF v_end_date IS NOT NULL AND v_end_date < CURDATE() THEN
        SIGNAL SQLSTATE '45400' SET MESSAGE_TEXT = 'Petition has expired';
    END IF;

    INSERT INTO signatures (petition_id, user_id) VALUES (p_petition_id, p_user_id);
END$$
DELIMITER ;

-- ---------- seed data ----------
-- Demo accounts all use the password: Password@123  (bcrypt hash, cost 10)
SET @demo_hash = '$2a$10$hisQnrQLza9K5wAad168Zu/2vH1jdjyXXV2CAySGrqrMUcvKI/0/.';

INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('Aarav Sharma', 'aarav@gmail.com',      @demo_hash, '9876543210', 'user'),
('Priya Verma',  'priya@gmail.com',      @demo_hash, '9876543211', 'user'),
('Admin User',   'admin@civicvoice.com', @demo_hash, '9876543212', 'admin'),
('Rohan Singh',  'rohan@gmail.com',      @demo_hash, '9876543213', 'user');

INSERT INTO categories (category_name, description) VALUES
('Education', 'Schools, colleges and educational facilities'),
('Environment', 'Pollution and environmental protection'),
('Healthcare', 'Public healthcare and medical facilities'),
('Public Transport', 'Roads, buses and transportation'),
('Community Development', 'Local development and public facilities');

INSERT INTO petitions (creator_id, category_id, title, description, problem_statement,
                       proposed_solution, target_signatures, status, location, end_date) VALUES
(1, 1, 'Improve College Library Facilities', 'We request better library facilities for students.',
 'The library has limited seating and outdated books.', 'Provide more seating, new books and extended hours.',
 500, 'published', 'Gurugram, Haryana', DATE_ADD(CURDATE(), INTERVAL 60 DAY)),
(2, 2, 'Make Our Neighbourhood Plastic-Free', 'We want to reduce plastic pollution.',
 'Plastic waste is increasing in public areas.', 'Install recycling bins and organise awareness campaigns.',
 300, 'published', 'Gurugram, Haryana', DATE_ADD(CURDATE(), INTERVAL 45 DAY)),
(4, 4, 'Increase Local Bus Services', 'Residents need more frequent public buses.',
 'Long waiting times create commuting difficulties.', 'Increase bus frequency during peak hours.',
 1000, 'under_review', 'Gurugram, Haryana', DATE_ADD(CURDATE(), INTERVAL 90 DAY));

INSERT INTO signatures (petition_id, user_id) VALUES (1,2),(1,4),(2,1),(2,4),(3,1),(3,2);

INSERT INTO petition_comments (petition_id, user_id, comment_text) VALUES
(1, 2, 'I support better library facilities.'),
(1, 4, 'More books and study spaces are needed.'),
(2, 1, 'We should keep our neighbourhood clean.'),
(3, 2, 'Better bus services will help students.');

INSERT INTO feedback (user_id, subject, message, rating) VALUES
(1, 'Website Design', 'The website is easy to use and understand.', 5),
(2, 'New Feature', 'Please add petition search and filters.', 4),
(4, 'Suggestion', 'Add notifications when petitions reach their goals.', 5);
