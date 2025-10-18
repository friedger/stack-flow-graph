import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            404
          </h1>
          <p className="text-xl text-muted-foreground">Oops! Page not found</p>
          <Link to="/">
            <Button variant="default" size="lg" className="gap-2">
              <Home className="h-4 w-4" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
