import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Check, Sparkles, Zap, Users, Shield, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Content Design AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href="#pricing">Pricing</a>
            </Button>
            <Button asChild>
              <Link href="/chat">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              AI-Powered Content Design
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Generate Perfect UX Copy in{" "}
              <span className="text-primary">Seconds</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop struggling with microcopy. Let AI help you create clear, consistent, and conversion-optimized content for your products.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/chat">
                  Start Free Trial
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/generate">See Demo</Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Free tier includes 25 generations per month. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Everything You Need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for content design teams
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>10+ Content Types</CardTitle>
                <CardDescription>
                  Buttons, errors, empty states, forms, tooltips, navigation, and more
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Share brand voice, projects, and content library across your team
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Brand Voice Control</CardTitle>
                <CardDescription>
                  Maintain consistent tone and style across all generated content
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription>
                  Track team performance and content generation patterns
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Sparkles className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Figma Plugin</CardTitle>
                <CardDescription>
                  Generate content directly in your designs with frame analysis
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Check className="h-10 w-10 text-primary mb-2" />
                <CardTitle>UX Best Practices</CardTitle>
                <CardDescription>
                  Built-in knowledge from Google, Apple, Microsoft, and Nielsen Norman Group
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your team
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>For individuals exploring</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>25 generations/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Web app access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>1 user</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/chat">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
            
            {/* Pro Tier */}
            <Card className="border-primary">
              <CardHeader>
                <div className="inline-flex px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium w-fit mb-2">
                  Popular
                </div>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For professional designers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>1,000 generations/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Figma plugin access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Brand voice presets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/chat">Start Trial</Link>
                </Button>
              </CardContent>
            </Card>
            
            {/* Team Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>For growing teams</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>5,000 generations/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Up to 10 users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Shared brand voice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Team collaboration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/chat">Start Trial</Link>
                </Button>
              </CardContent>
            </Card>
            
            {/* Business Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Business</CardTitle>
                <CardDescription>For large organizations</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>25,000 generations/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Up to 50 users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>API access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>SSO</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Dedicated support</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <a href={getLoginUrl()}>Contact Sales</a>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Need more? <a href={getLoginUrl()} className="text-primary hover:underline">Contact us</a> for Enterprise pricing
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your Content Design?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join hundreds of teams using AI to create better UX copy faster
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/chat">
              Start Free Trial
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">Content Design AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Content Design AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
