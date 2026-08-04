export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-milky">
      <div className="max-w-prose mx-auto px-4 py-12 md:py-16">
        <article className="text-lg leading-relaxed space-y-6 text-slate-dark">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Спасибо за покупку
          </h1>
          <p>
            Оплата прошла успешно. Нейробук готов к скачиванию — откройте файл
            и начните с первой страницы.
          </p>
          <a
            href="/neurobook.pdf"
            download="Нейробук-Axonia-Kids.pdf"
            className="bg-accent text-white px-6 py-3.5 rounded-lg font-medium w-full md:w-auto text-center inline-flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Скачать Нейробук
          </a>
          <p className="text-base opacity-80">
            Файл сохранится на устройство. Если скачивание не началось —
            нажмите кнопку ещё раз или напишите в поддержку.
          </p>
        </article>
      </div>
    </main>
  );
}
