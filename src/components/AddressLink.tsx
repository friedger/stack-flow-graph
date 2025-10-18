import { formatAddress, isContractAddress } from "@/utils/formatters";

interface AddressLinkProps {
  address: string;
  variant?: "primary" | "accent";
  startChars?: number;
  endChars?: number;
}

export function AddressLink({ 
  address, 
  variant = "primary",
  startChars = 8,
  endChars = 6
}: AddressLinkProps) {
  const getExplorerAddressUrl = (addr: string) => {
    return `https://explorer.hiro.so/address/${addr}?chain=mainnet`;
  };

  const isContract = isContractAddress(address);
  
  // Contract addresses always use purple styling
  const contractClasses = "bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/30 border-purple-500/30 dark:border-purple-400/40";
  
  // Non-contract addresses use variant-based styling
  const variantClasses = variant === "accent"
    ? "bg-accent/10 text-accent hover:bg-accent/20 border-accent/20"
    : "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20";

  return (
    <a
      href={getExplorerAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-colors border ${
        isContract ? contractClasses : variantClasses
      }`}
    >
      {formatAddress(address, startChars, endChars)}
    </a>
  );
}
