import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { siteConfig } from '@/lib/config';
import { TrendingUp, Zap, ShieldCheck, Globe, MapPin, Rocket, ArrowRight } from 'lucide-react';

const talkingPoints = [
  {
    icon: TrendingUp,
    title: 'Accept Bitcoin Payments',
    description:
      'Tools like BTCPay Server, Strike, and OpenNode let you accept bitcoin and settle in seconds with minimal setup.',
  },
  {
    icon: Zap,
    title: 'Lightning Network',
    description:
      'Near-zero fees and instant confirmation make the Lightning Network perfect for everyday retail transactions.',
  },
  {
    icon: ShieldCheck,
    title: 'No Chargebacks',
    description:
      'Bitcoin transactions are final. Eliminate chargeback fraud and the fees that come with it.',
  },
  {
    icon: Globe,
    title: 'Global Customer Base',
    description:
      'Accept payments from anyone worldwide without currency conversion headaches or international processing fees.',
  },
  {
    icon: MapPin,
    title: 'Get on BTCMap',
    description:
      'BTCMap is the community-maintained directory Bitcoiners use to find merchants. Get listed and attract new customers.',
  },
  {
    icon: Rocket,
    title: 'Getting Started',
    description:
      'A free Lightning address and a mobile wallet is all you need to start accepting bitcoin today.',
  },
];

export default function Business() {
  const siteTitle = siteConfig.siteTitle;

  useSeoMeta({
    title: `Business - ${siteTitle}`,
    description: `Learn how your business can accept bitcoin. Resources and nearby bitcoin-accepting businesses from ${siteTitle}.`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Hero */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">Bitcoin for Business</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join the growing number of businesses accepting bitcoin. Lower fees, no chargebacks, and access to a global customer base.
              </p>
              <Link to="/business/map">
                <Button size="lg" className="mt-2">
                  Find Bitcoin Businesses Near You
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Talking Points Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {talkingPoints.map((point) => (
                <Card key={point.title}>
                  <CardHeader className="pb-2">
                    <point.icon className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">{point.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bottom CTA */}
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <h2 className="text-2xl font-semibold">See Who Already Accepts Bitcoin</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Explore bitcoin-accepting businesses in our area powered by BTCMap.
                </p>
                <Link to="/business/map">
                  <Button variant="outline" size="lg">
                    <MapPin className="mr-2 h-4 w-4" />
                    View the Map
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
