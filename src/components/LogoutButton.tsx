// Кнопка выхода — простой POST-запрос на /logout. Подпись передаётся из layout.
export default function LogoutButton({ label }: { label: string }) {
  return (
    <form action="/logout" method="post">
      <button type="submit" className="btn-secondary">
        {label}
      </button>
    </form>
  );
}
