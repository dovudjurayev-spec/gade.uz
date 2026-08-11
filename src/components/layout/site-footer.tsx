export function SiteFooter() {
  return (
    <footer className="border-t bg-neutral-50 mt-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="text-lg font-semibold tracking-widest mb-2">GADE</div>
          <p className="text-neutral-600">
            Официальный дистрибьютор GADE Cosmetics в Узбекистане.
          </p>
        </div>
        <div>
          <div className="font-medium mb-2">Магазин</div>
          <ul className="space-y-1 text-neutral-600">
            <li><a href="/catalog">Каталог</a></li>
            <li><a href="/quiz">Подбор ухода</a></li>
            <li><a href="/favorites">Избранное</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Информация</div>
          <ul className="space-y-1 text-neutral-600">
            <li><a href="/about">О компании</a></li>
            <li><a href="/delivery">Доставка и оплата</a></li>
            <li><a href="/faq">FAQ</a></li>
            <li><a href="/privacy">Политика конфиденциальности</a></li>
            <li><a href="/offer">Публичная оферта</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Контакты</div>
          <ul className="space-y-1 text-neutral-600">
            <li>Ташкент</li>
            <li><a href="tel:+998000000000">+998 00 000 00 00</a></li>
            <li><a href="https://t.me/">Telegram</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} GADE.uz
      </div>
    </footer>
  );
}
