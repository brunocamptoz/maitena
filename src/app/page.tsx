import { Hero } from "@/components/home/hero";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { Assurances } from "@/components/home/assurances";

export default function Home() {
  return (
    <>
      <Hero />
      <CategoryShowcase />
      <Assurances />
    </>
  );
}
