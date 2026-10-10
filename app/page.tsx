import config from "@/config";
import { Hero } from "@/components/home/Hero";

export default function Home() {
  const hero = config.landing.hero;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 flex flex-col">
        <Hero hero={hero} />
      </main>
    </div>
  );
}
