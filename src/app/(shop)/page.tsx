import { Hero } from "@/components/home/hero";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Assurances } from "@/components/home/assurances";

export default function Home() {
  return (
    <>
      <Hero />
      <CategoryShowcase />
      <NewArrivals />
      <Assurances />
    </>
  );
}
