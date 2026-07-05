// Кнопка выхода — простой POST-запрос на /logout.
export default function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <button type="submit" className="btn-secondary">
        Выйти
      </button>
    </form>
  );
}
