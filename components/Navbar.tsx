"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutPatient } from "@/lib/actions/patient.actions";

// The forum and chatbot are separate apps; their links only show when configured.
const externalLinks = [
  { href: process.env.NEXT_PUBLIC_FORUM_URL, text: "Community Forum" },
  { href: process.env.NEXT_PUBLIC_CHATBOT_URL, text: "Chatbot" },
].filter((link): link is { href: string; text: string } => Boolean(link.href));

const Navbar = ({ userId }: { userId: string }) => {
  const pathname = usePathname();
  const appointmentHref = `/patients/${userId}/new-appointment`;

  return (
    <nav className="bg-black px-6 py-4 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Image
          src="/assets/icons/logo-full.svg"
          height={40}
          width={150}
          alt="logo"
          className="h-10 w-auto"
        />
        <div className="flex space-x-6">
          <NavItem
            href={appointmentHref}
            text="New Appointment"
            active={pathname === appointmentHref}
          />
          {externalLinks.map((link) => (
            <NavItem key={link.text} href={link.href} text={link.text} />
          ))}
          <form action={signOutPatient}>
            <button
              type="submit"
              className="text-lg text-white opacity-80 hover:opacity-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
};

interface NavItemProps {
  href: string;
  text: string;
  active?: boolean;
}

const NavItem = ({ href, text, active = false }: NavItemProps) => (
  <Link
    href={href}
    className="relative"
    aria-current={active ? "page" : undefined}
  >
    <span
      className={`cursor-pointer text-lg text-white transition-all duration-300 ease-in-out hover:scale-105 ${
        active ? "font-bold underline" : "opacity-80 hover:opacity-100"
      }`}
    >
      {text}
    </span>
  </Link>
);

export default Navbar;
