import React from "react";
import { Link } from "wouter";
import { ArrowRight, Box, BarChart3, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <Box className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">CK GROUP</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Button asChild className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-white">
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            v2.0 Inventory Engine Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Professional Spare Parts <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Inventory Management</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The industrial command center for factories and workshops. Track stock, analyze expenses, and never run out of critical parts again.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" asChild className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25">
              <Link href="/sign-up">
                Start Tracking Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-base border-white/10 hover:bg-white/5">
              <Link href="/sign-in">
                Sign In to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 relative z-10 text-left">
          <div className="bg-card/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <Box className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Precision Tracking</h3>
            <p className="text-muted-foreground">Real-time stock levels, condition tracking, and detailed part histories. Built for engineers.</p>
          </div>
          <div className="bg-card/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <BarChart3 className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Expense Analytics</h3>
            <p className="text-muted-foreground">Deep insights into monthly spending, category breakdowns, and supplier costs over time.</p>
          </div>
          <div className="bg-card/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <BellRing className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Low Stock Alerts</h3>
            <p className="text-muted-foreground">Automated thresholds and warnings ensure you reorder before critical parts run out.</p>
          </div>
        </div>
      </main>
    </div>
  );
}