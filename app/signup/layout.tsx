import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | Crack Origins',
  description: 'Join the Crack Origins community. Create an account to start your journey through high-performance chronicles and exclusive indie games.',
  alternates: {
    canonical: 'https://crackorigins.com/signup',
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
