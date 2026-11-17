import { Link } from 'react-router-dom';
import { GithubIcon, Logo } from './Icon';
import { GITHUB_URL } from '../config';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--line)]">
      <div className="wrap flex flex-col gap-6 py-10 text-[14px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-[var(--deep)] p-0.5"><Logo size={24} /></span>
          <span>
            <strong className="font-semibold text-ink">CivicVoice</strong> · Turn scattered complaints into verified, trackable public demand.
          </span>
        </div>
        <nav className="flex gap-5" aria-label="Footer">
          <Link to="/" className="hover:text-ink">Explore</Link>
          <Link to="/petitions/new" className="hover:text-ink">Start a petition</Link>
          <Link to="/feedback" className="hover:text-ink">Feedback</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
            <GithubIcon size={15} /> GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
