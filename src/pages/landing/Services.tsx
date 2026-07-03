import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ServicesGrid } from "@/components/landing/ServicesGrid";

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 bg-gradient-hero text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold">Our Services</h1>
          <p className="mt-3 text-white/80 max-w-2xl">Ten specialised service lines, one accountable platform.</p>
        </div>
      </div>
      <ServicesGrid heading={false} />
      <Footer />
    </div>
  );
}