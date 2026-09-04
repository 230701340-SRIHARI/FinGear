import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("fingear_theme") || "system");
  const [fontSizePx, setFontSizePx] = useState(() => Number(localStorage.getItem("fingear_fontSizePx")) || 16);
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("fingear_highContrast") === "true");
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("fingear_reducedMotion") === "true");
  const [dyslexicFont, setDyslexicFont] = useState(() => localStorage.getItem("fingear_dyslexicFont") === "true");
  const [colorBlindMode, setColorBlindMode] = useState(() => localStorage.getItem("fingear_colorBlindMode") || "none");
  const [enhancedFocus, setEnhancedFocus] = useState(() => localStorage.getItem("fingear_enhancedFocus") === "true");
  const [lineSpacing, setLineSpacing] = useState(() => localStorage.getItem("fingear_lineSpacing") || "normal");

  useEffect(() => {
    const root = document.documentElement;

    // 1. Theme (Dark / Light / System)
    const isDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("fingear_theme", theme);

    // 2. Font Size Slider (px)
    root.style.fontSize = `${fontSizePx}px`;
    localStorage.setItem("fingear_fontSizePx", fontSizePx);

    // 3. High Contrast
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    localStorage.setItem("fingear_highContrast", highContrast);

    // 4. Reduced Motion
    if (reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
    localStorage.setItem("fingear_reducedMotion", reducedMotion);

    // 5. Dyslexic-friendly Font
    if (dyslexicFont) {
      root.classList.add("dyslexic-font");
    } else {
      root.classList.remove("dyslexic-font");
    }
    localStorage.setItem("fingear_dyslexicFont", dyslexicFont);

    // 6. Color Blindness Filter
    root.classList.remove("cb-protanopia", "cb-deuteranopia", "cb-tritanopia", "cb-monochrome");
    if (colorBlindMode !== "none") {
      root.classList.add(`cb-${colorBlindMode}`);
    }
    localStorage.setItem("fingear_colorBlindMode", colorBlindMode);

    // 7. Enhanced Focus Indicator
    if (enhancedFocus) {
      root.classList.add("enhanced-focus");
    } else {
      root.classList.remove("enhanced-focus");
    }
    localStorage.setItem("fingear_enhancedFocus", enhancedFocus);

    // 8. Line Spacing
    root.classList.remove("spacing-relaxed", "spacing-loose");
    if (lineSpacing === "relaxed") root.classList.add("spacing-relaxed");
    if (lineSpacing === "loose") root.classList.add("spacing-loose");
    localStorage.setItem("fingear_lineSpacing", lineSpacing);

  }, [theme, fontSizePx, highContrast, reducedMotion, dyslexicFont, colorBlindMode, enhancedFocus, lineSpacing]);

  // System dark mode listener
  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  function resetAccessibility() {
    setTheme("system");
    setFontSizePx(16);
    setHighContrast(false);
    setReducedMotion(false);
    setDyslexicFont(false);
    setColorBlindMode("none");
    setEnhancedFocus(false);
    setLineSpacing("normal");
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        fontSizePx,
        setFontSizePx,
        highContrast,
        setHighContrast,
        reducedMotion,
        setReducedMotion,
        dyslexicFont,
        setDyslexicFont,
        colorBlindMode,
        setColorBlindMode,
        enhancedFocus,
        setEnhancedFocus,
        lineSpacing,
        setLineSpacing,
        resetAccessibility,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
