import DesignSystemReference from "@/components/ui/DesignSystemReference";
import {
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
} from "@/lib/layout-foundation";

export const metadata = {
  title: "Design System Reference",
};

export default function DesignSystemReferencePage() {
  return (
    <main className={appPageShellClass}>
      <section className={`${appPageContainerClass} ${appPageSectionClass}`}>
        <div className="mx-auto w-full max-w-[1400px]">
          <DesignSystemReference />
        </div>
      </section>
    </main>
  );
}
