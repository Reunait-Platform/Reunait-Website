"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Globe, Shield } from "lucide-react"

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative background blurs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-emerald-500 via-primary to-emerald-500 bg-clip-text text-transparent pb-2">
            Contact Support
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            Have questions about the platform, security, or payments? Get in touch with our team.
          </p>
        </div>

        {/* Contact details Card centered */}
        <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
          <CardHeader className="text-center border-b border-border/40 pb-6">
            <CardTitle className="text-2xl font-bold">Contact Info</CardTitle>
            <CardDescription>Direct support channels for Reunait</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary mt-1 flex-shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-lg">Email Address</h4>
                <p className="text-muted-foreground mt-1">
                  <a href="mailto:reunait.com@gmail.com" className="hover:text-primary hover:underline transition-colors duration-200 font-medium">
                    reunait.com@gmail.com
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">We respond to all inquiries within 24-48 hours</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 mt-1 flex-shrink-0">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-lg">Global Mission</h4>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Reunait operates as a borderless network to help search and match cases globally. 
                  For legal or authority-related query requests, please contact us via our official email channel.
                </p>
              </div>
            </div>

            {process.env.NEXT_PUBLIC_MERCHANT_LEGAL_NAME && (
              <div className="flex items-start gap-4 pt-6 border-t border-border/40">
                <div className="p-3 rounded-lg bg-primary/10 text-primary mt-1 flex-shrink-0">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-lg">Merchant Legal Identity</h4>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    This platform is owned and operated under the legal entity name: <strong className="text-foreground font-semibold">{process.env.NEXT_PUBLIC_MERCHANT_LEGAL_NAME}</strong>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
