import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export function Footer() {
  const socialLinks = {
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || "#",
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || "#",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "#",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || "#",
  }

  return (
    <footer
      role="contentinfo"
      className="relative border-t bg-background/50 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            {/* Left: Brand & Copyright */}
            <div className="flex flex-col items-center gap-2 md:items-start">
              <Logo />
              <p className="text-xs text-muted-foreground/70 font-medium mt-1">
                © {new Date().getFullYear()} Reunait. All rights reserved.
              </p>
            </div>

            {/* Center: Legal & Contact links */}
            <nav 
              aria-label="Footer Navigation" 
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground/80"
            >
              <Link href="/terms" className="hover:text-primary transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-primary transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/refunds" className="hover:text-primary transition-colors duration-200">
                Refund Policy
              </Link>
              <Link href="/contact" className="hover:text-primary transition-colors duration-200">
                Contact Us
              </Link>
            </nav>

            {/* Right: Social Icons */}
            <nav 
              aria-label="Social media links" 
              className="flex items-center gap-4"
            >
              <Link
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our Facebook page"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our Twitter page"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our Instagram page"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our LinkedIn page"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}