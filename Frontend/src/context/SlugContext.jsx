import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { ORG_SLUG } from "../api";

const SlugContext = createContext(ORG_SLUG);

/**
 * SlugProvider — wraps all /vote/:slug routes.
 * Reads the slug from the URL and makes it available
 * to any child component via useSlug().
 */
export function SlugProvider({ children }) {
  const { slug } = useParams();
  return (
    <SlugContext.Provider value={slug || ORG_SLUG}>
      {children}
    </SlugContext.Provider>
  );
}

/**
 * useSlug — returns the current org slug.
 * Use this in any voter-facing page or component
 * instead of importing ORG_SLUG directly.
 */
export const useSlug = () => useContext(SlugContext);
