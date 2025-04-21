import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// To activate this webpage:
//   npm run swizzle @docusaurus/theme-classic NotFound 
// To rebuild:
//   rm -rf build .docusaurus
//   npm run build

export default function NotFound() {
  return (
      <main className="container margin-vert--xl text--center">
        <h1 className="hero__title">🚧 Page Not Found</h1>
        <p className="hero__subtitle">
          We have recently migrated to a new documentation platform based on <strong>Docusaurus</strong>.<br />
          The page you are looking for may have been moved or renamed.
        </p>
        <Link
          className="button button--primary button--lg margin-top--md"
          to="/"
        >
          Go to Homepage
        </Link>
      </main>
  );
}

