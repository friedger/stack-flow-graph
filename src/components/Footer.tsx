import { Github } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="STX Network Logo" className="h-8 w-8" />
            <span className="text-sm text-muted-foreground">
              STX Network Visualizer
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/yourusername/stx-network-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>View on GitHub</span>
            </a>
            
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} All rights reserved
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
