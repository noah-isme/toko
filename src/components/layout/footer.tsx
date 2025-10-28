import { Container } from '@/components/layout/container';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-6 text-sm text-muted-foreground">
      <Container className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} toko. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </Container>
    </footer>
  );
}
