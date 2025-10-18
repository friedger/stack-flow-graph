import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
}

export const SEO = ({ 
  title, 
  description, 
  image, 
  url, 
  type = 'website' 
}: SEOProps) => {
  const siteName = 'Stacks Endowment Visualizer';
  const fullImageUrl = image.startsWith('http') ? image : `https://sip-031.fastpool.org${image}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:domain" content="sip-031.fastpool.org" />
      
      {/* Additional Meta */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
    </Helmet>
  );
};
