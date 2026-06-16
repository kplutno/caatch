import './globals.css';

export const metadata = {
  title: 'Caatch',
  description: 'Caatch full-stack application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
