import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, BarChart3, PieChart, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center mb-6">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Phoenix Trading System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Advanced AI-powered trading platform with real-time market data, 
            automated strategies, and comprehensive portfolio management.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" size="lg">Sign Up</Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Real-time Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Execute trades with real-time market data and instant order execution.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <PieChart className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Portfolio Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track performance, analyze P&L, and monitor risk metrics.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle>AI Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Deploy automated trading strategies powered by advanced AI algorithms.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Work together with team members and share trading insights.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start trading?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of traders using Phoenix for smarter trading decisions.
          </p>
          <Link href="/auth/register">
            <Button size="lg">Create Your Account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
