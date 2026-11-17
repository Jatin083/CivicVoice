import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap flex flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="mono text-[13px] text-muted">404</span>
      <h1 className="h2 mt-3">This page doesn’t exist</h1>
      <p className="lede mt-2">The link may be broken, or the page may have moved.</p>
      <Link to="/" className="btn btn-primary mt-7">Back to petitions</Link>
    </div>
  );
}
