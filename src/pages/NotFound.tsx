import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      
      <div className="text-center space-y-8 relative z-10 max-w-2xl mx-auto">
        <div className="space-y-4">
          <h1 className="text-9xl md:text-[12rem] font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
            404
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-primary to-accent rounded-full" />
        </div>
        
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <Link to="/" className="inline-block animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Button variant="default" size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
            <Home className="h-4 w-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
