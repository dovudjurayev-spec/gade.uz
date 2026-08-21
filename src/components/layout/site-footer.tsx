import Link from "next/link";
import Image from "next/image";
import { Instagram, Send, Phone, MapPin, Mail, ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative bg-neutral-950 text-neutral-300 mt-16 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[900px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* CTA / newsletter */}
      <div className="relative mx-auto max-w-7xl px-4 md:px-8 pt-16 md:pt-20 pb-12">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-16 items-end">
          <div>
            <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Newsletter</span>
            <h3 className="mt-3 text-3xl md:text-5xl font-light leading-[1.05] tracking-tight text-white">
              Красота начинается<br />с первого письма.
            </h3>
            <p className="mt-4 max-w-md text-sm text-neutral-400 leading-relaxed">
              Подпишитесь — расскажем о новинках, закрытых распродажах и уходе, который действительно работает.
            </p>
          </div>
          <form className="w-full">
            <label className="block text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-3">Ваш email</label>
            <div className="flex border-b border-white/20 focus-within:border-white transition-colors">
              <input
                type="email"
                required
                placeholder="you@gade.uz"
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none"
              />
              <button
                type="submit"
                className="group inline-flex items-center gap-2 py-3 text-xs uppercase tracking-[0.2em] text-white hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Подписаться
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-14 md:py-16 grid gap-12 md:gap-10 md:grid-cols-12 text-sm">
          {/* Brand block */}
          <div className="md:col-span-4">
            <Image
              src="/logo-white.png"
              alt="GADE"
              width={144}
              height={40}
              className="h-6 w-auto mb-6"
            />
            <p className="text-neutral-400 leading-relaxed max-w-xs mb-8">
              Официальный дистрибьютор GADE Cosmetics в Узбекистане. Профессиональный уход — прямо к вам домой.
            </p>
            <div className="flex items-center gap-2">
              <SocialLink href="https://instagram.com/" label="Instagram">
                <Instagram className="h-4 w-4" strokeWidth={1.5} />
              </SocialLink>
              <SocialLink href="https://t.me/" label="Telegram">
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </SocialLink>
              <SocialLink href="tel:+998000000000" label="Позвонить">
                <Phone className="h-4 w-4" strokeWidth={1.5} />
              </SocialLink>
            </div>
          </div>

          {/* Links */}
          <FooterColumn title="Магазин" className="md:col-span-2">
            <FooterLink href="/catalog">Каталог</FooterLink>
            <FooterLink href="/catalog?sale=1">Скидки</FooterLink>
            <FooterLink href="/catalog?sort=popular">Хиты</FooterLink>
            <FooterLink href="/account/favorites">Избранное</FooterLink>
          </FooterColumn>

          <FooterColumn title="Помощь" className="md:col-span-2">
            <FooterLink href="/delivery">Доставка</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/about">О компании</FooterLink>
            <FooterLink href="/offer">Оферта</FooterLink>
            <FooterLink href="/privacy">Конфиденциальность</FooterLink>
          </FooterColumn>

          {/* Contacts */}
          <div className="md:col-span-4">
            <div className="text-white text-[11px] uppercase tracking-[0.25em] mb-5">Контакты</div>
            <ul className="space-y-4 text-neutral-400">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-neutral-500 shrink-0" strokeWidth={1.5} />
                <span>Ташкент, Мирабадский р-н<br />доставка по всему Узбекистану</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-neutral-500 shrink-0" strokeWidth={1.5} />
                <a href="tel:+998000000000" className="hover:text-white transition-colors">+998 00 000 00 00</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-neutral-500 shrink-0" strokeWidth={1.5} />
                <a href="mailto:hello@gade.uz" className="hover:text-white transition-colors">hello@gade.uz</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment strip + copyright */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} GADE.uz — Все права защищены
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="text-white text-[11px] uppercase tracking-[0.25em] mb-5">{title}</div>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
      >
        <span className="h-px w-0 bg-white transition-all duration-300 group-hover:w-3" />
        {children}
      </Link>
    </li>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="grid place-items-center h-10 w-10 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white transition-colors cursor-pointer"
    >
      {children}
    </a>
  );
}
