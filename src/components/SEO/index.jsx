import React from "react"
import { Helmet } from "react-helmet"
import { siteUrl } from "../../../blog-config"

const SEO = ({ title, description, url }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:image" content={`${siteUrl}/og-image.png`} />
      {description && <meta name="description" content={description} />}
      {description && <meta property="og:description" content={description} />}
      <meta
        name="google-site-verification"
        content="aR-7EHD5C3SxkNr1Ljuy-D6hskRSo6QXEi-wKLCDc7o"
      />
    </Helmet>
  )
}

export default SEO
