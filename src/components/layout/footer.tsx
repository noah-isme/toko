import { Container } from '@/components/layout/container';
import { NewsletterSignup } from '@/components/newsletter-signup';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 text-sm text-muted-foreground">
      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <NewsletterSignup />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/products" className="hover:text-foreground">
                  Products
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-foreground">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-foreground">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/shipping" className="hover:text-foreground">
                  Shipping Policy
                </a>
              </li>
              <li>
                <a href="/returns" className="hover:text-foreground">
                  Returns
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <Container className="border-t py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} toko. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
