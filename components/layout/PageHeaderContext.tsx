// components/layout/PageHeaderContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface PageHeaderState {
  /** Bold title shown in the top bar, e.g. course name or page name. */
  title: string;
  /** Optional muted line under the title, e.g. section/instructor. */
  subtitle?: string;
  /** Optional row rendered below the title (e.g. CourseTabs). */
  tabs?: ReactNode;
}

// Split into two contexts on purpose:
// - HeaderValueContext changes every time a page sets its header — only
//   TopNav (which needs to render it) should subscribe to this one.
// - HeaderSetterContext never changes identity (the setState function is
//   stable). Pages calling usePageHeader only need the setter, so they
//   subscribe to this one and never re-render when the header value
//   itself changes. Without this split, setting the header would
//   re-render the calling page, which recreates any JSX passed as
//   `tabs`, which re-triggers the effect that calls setHeader — an
//   infinite loop ("Maximum update depth exceeded").
const HeaderValueContext = createContext<PageHeaderState | null>(null);
const HeaderSetterContext = createContext<
  ((header: PageHeaderState | null) => void) | null
>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderState | null>(null);

  return (
    <HeaderSetterContext.Provider value={setHeader}>
      <HeaderValueContext.Provider value={header}>
        {children}
      </HeaderValueContext.Provider>
    </HeaderSetterContext.Provider>
  );
}

/**
 * Read the current header state. Used by TopNav to render it.
 */
export function usePageHeaderValue() {
  return useContext(HeaderValueContext);
}

function useHeaderSetter() {
  const setHeader = useContext(HeaderSetterContext);
  if (!setHeader) {
    throw new Error(
      "usePageHeader must be used within a PageHeaderProvider (check AppShell)."
    );
  }
  return setHeader;
}

/**
 * Call from any page/layout to set the top bar's title, subtitle, and
 * optional tabs row. Automatically clears itself on unmount so the next
 * page doesn't inherit a stale title.
 *
 * Example (course stream page):
 *   usePageHeader({
 *     title: course.name,
 *     subtitle: course.section,
 *     tabs: <CourseTabs courseId={course.id} role={role} />,
 *   });
 */
export function usePageHeader(header: PageHeaderState) {
  const setHeader = useHeaderSetter();
  const { title, subtitle, tabs } = header;

  // Keep the latest tabs node in a ref so the effect below can read it
  // without needing `tabs` in its dependency array — `tabs` is a fresh
  // JSX element on every render and would otherwise re-fire the effect
  // on every render for any reason, not just a real change.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    setHeader({ title, subtitle, tabs: tabsRef.current });
    return () => setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, setHeader]);
}
