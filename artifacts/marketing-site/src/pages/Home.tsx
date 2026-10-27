import { Component as LuminaInteractiveList } from "@/components/ui/lumina-interactive-list";
import "@/components/ui/lumina-slider.css";

/**
 * Experimental Lumina redesign (local only — do not ship until approved).
 * Previous marketing home is preserved at `Home.legacy.tsx` for easy revert.
 */
export default function Home() {
  return <LuminaInteractiveList />;
}
