import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Network, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      
      {/* Animated floating network nodes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/20 animate-pulse"
            style={{
              width: `${Math.random() * 40 + 20}px`,
              height: `${Math.random() * 40 + 20}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>
      
      <div className="text-center space-y-8 relative z-10 max-w-2xl mx-auto">
        {/* Network icon with animation */}
        <div className="flex justify-center animate-in fade-in duration-700">
          <div className="relative">
            <Network className="h-20 w-20 text-primary animate-pulse" strokeWidth={1.5} />
            <div className="absolute -top-2 -right-2 h-6 w-6 bg-destructive rounded-full flex items-center justify-center text-xs font-bold text-destructive-foreground">
              !
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-9xl md:text-[12rem] font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
            404
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-primary to-accent rounded-full animate-in fade-in duration-700 delay-100" />
        </div>
        
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Transaction Failed: Path Not Found
          </h2>
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              This path does not lead to funds of the Stacks Endowment.
            </p>
            <p className="text-sm text-muted-foreground/80 max-w-lg mx-auto font-mono">
              Error: Unable to locate requested information in SIP-031.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link to="/">
            <Button variant="default" size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <Home className="h-4 w-4" />
              Return to overview
            </Button>
          </Link>
          <Link to="/transactions">
            <Button variant="outline" size="lg" className="gap-2 hover:bg-accent/10 transition-all hover:scale-105">
              <ArrowLeft className="h-4 w-4" />
              View Transactions
            </Button>
          </Link>
        </div>

        {/* Fake transaction hash */}
        <div className="pt-4 animate-in fade-in duration-700 delay-500">
          <p className="text-xs text-muted-foreground/60 font-mono">
            Tx Hash: 0x404...not...found
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
