
document.addEventListener("DOMContentLoaded", () => {
    // =====================================
    // ДАННЫЕ И СОХРАНЕНИЕ
    // =====================================

    const STORAGE_KEY = "edudiary_main";

    function createId() {
        return Date.now() + Math.floor(Math.random() * 10000);
    }

    function loadData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (saved && Array.isArray(saved.subjects)) {
                return saved;
            }
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        }

        return {
            subjects: [],
            profile: {
                name: "Мой профиль",
                email: ""
            }
        };
    }

    const data = loadData();

    let subjects = data.subjects.map(subject => ({
        ...subject,
        id: subject.id || createId(),
        grades: Array.isArray(subject.grades) ? subject.grades : []
    }));

    let profile = data.profile || {
        name: "Мой профиль",
        email: ""
    };

    function saveData() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ subjects, profile })
            );
        } catch (error) {
            console.error("Не удалось сохранить данные:", error);
            alert("Не удалось сохранить данные в браузере.");
        }
    }

    // =====================================
    // ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ
    // =====================================

    const get = id => document.getElementById(id);

    const sidebar = get("sidebar");
    const sidebarToggle = get("sidebarToggle");

    const subjectForm = get("subjectForm");
    const subjectInput = get("subjectInput");
    const subjectList = get("subjectList");
    const subjectListCount = get("subjectListCount");

    const gradeForm = get("gradeForm");
    const gradeSubject = get("gradeSubject");
    const gradeValue = get("gradeValue");
    const gradeDate = get("gradeDate");
    const gradeList = get("gradeList");
    const gradeListCount = get("gradeListCount");

    const subjectCount = get("subjectCount");
    const gradeCount = get("gradeCount");
    const averageGrade = get("averageGrade");

    const recentGrades = get("recentGrades");
    const forecastAverage = get("forecastAverage");
    const forecastMessage = get("forecastMessage");
    const subjectForecast = get("subjectForecast");

    const profileName = get("profileName");
    const profileEmail = get("profileEmail");
    const profileAuthButton = get("profileAuthButton");

    // =====================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // =====================================

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function formatDate(date) {
        if (!date) return "";

        const parts = date.split("-");

        if (parts.length !== 3) return date;

        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    function getAllGrades() {
        return subjects.flatMap(subject =>
            subject.grades.map(grade => ({
                ...grade,
                subjectName: subject.name,
                subjectId: subject.id
            }))
        );
    }

    function getAverage(grades) {
        if (!grades.length) return null;

        const sum = grades.reduce(
            (total, grade) => total + Number(grade.value),
            0
        );

        return sum / grades.length;
    }

    // =====================================
    // НАВИГАЦИЯ
    // =====================================

    const navigationLinks = document.querySelectorAll(".sidebar-link");
    const sections = document.querySelectorAll(".page-section");

    navigationLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            const sectionId = link.dataset.section;

            navigationLinks.forEach(item => {
                item.classList.toggle("active", item === link);
            });

            sections.forEach(section => {
                section.classList.toggle(
                    "active",
                    section.id === sectionId
                );
            });

            history.replaceState(null, "", `#${sectionId}`);

            if (window.innerWidth <= 700) {
                sidebar?.classList.remove("collapsed");
            }
        });
    });

    // =====================================
    // СВЁРТЫВАНИЕ БОКОВОГО МЕНЮ
    // =====================================

    sidebarToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("collapsed");

        const isCollapsed = sidebar?.classList.contains("collapsed");

        sidebarToggle.setAttribute(
            "aria-expanded",
            String(!isCollapsed)
        );

        sidebarToggle.textContent = isCollapsed ? "›" : "‹";
    });

    // =====================================
    // ПРЕДМЕТЫ
    // =====================================

    subjectForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = subjectInput.value.trim();

        if (!name) {
            subjectInput.focus();
            return;
        }

        const exists = subjects.some(subject =>
            subject.name.toLowerCase() === name.toLowerCase()
        );

        if (exists) {
            alert("Такой предмет уже существует.");
            return;
        }

        subjects.push({
            id: createId(),
            name,
            grades: []
        });

        saveData();
        subjectInput.value = "";

        renderAll();
    });

    function deleteSubject(subjectId) {
        const subject = subjects.find(item => item.id === subjectId);

        if (!subject) return;

        const confirmed = confirm(
            `Удалить предмет «${subject.name}» и все его оценки?`
        );

        if (!confirmed) return;

        subjects = subjects.filter(item => item.id !== subjectId);

        saveData();
        renderAll();
    }

    function renderSubjects() {
        if (!subjectList) return;

        subjectList.replaceChildren();

        if (subjectListCount) {
            subjectListCount.textContent = subjects.length;
        }

        if (subjects.length === 0) {
            subjectList.appendChild(
                createElement(
                    "p",
                    "empty-message",
                    "Ты ещё не добавил(а) предметы."
                )
            );

            return;
        }

        subjects.forEach(subject => {
            const card = createElement("article", "subject-item");

            const heading = createElement(
                "div",
                "subject-item-heading"
            );

            const name = createElement("h3", "", subject.name);

            const deleteButton = createElement(
                "button",
                "quiet-button",
                "Удалить"
            );

            deleteButton.type = "button";

            deleteButton.addEventListener("click", () => {
                deleteSubject(subject.id);
            });

            heading.append(name, deleteButton);

            const average = getAverage(subject.grades);

            const info = createElement(
                "p",
                "subject-info",
                average === null
                    ? "Оценок пока нет"
                    : `Оценок: ${subject.grades.length} · Средний балл: ${average.toFixed(2)}`
            );

            card.append(heading, info);
            subjectList.appendChild(card);
        });
    }

    // =====================================
    // СПИСОК ПРЕДМЕТОВ В ФОРМЕ ОЦЕНОК
    // =====================================

    function renderGradeSubjects() {
        if (!gradeSubject) return;

        const previousValue = gradeSubject.value;

        gradeSubject.replaceChildren();

        const placeholder = createElement(
            "option",
            "",
            subjects.length
                ? "Выбери предмет"
                : "Сначала добавь предмет"
        );

        placeholder.value = "";
        gradeSubject.appendChild(placeholder);

        subjects.forEach(subject => {
            const option = createElement(
                "option",
                "",
                subject.name
            );

            option.value = String(subject.id);
            gradeSubject.appendChild(option);
        });

        if (subjects.some(subject =>
            String(subject.id) === previousValue
        )) {
            gradeSubject.value = previousValue;
        }
    }

    // =====================================
    // ДОБАВЛЕНИЕ ОЦЕНКИ
    // =====================================

    gradeForm?.addEventListener("submit", event => {
        event.preventDefault();

        const subjectId = Number(gradeSubject.value);
        const value = Number(gradeValue.value);
        const date = gradeDate.value;

        const subject = subjects.find(
            item => item.id === subjectId
        );

        if (!subject) {
            alert("Сначала выбери предмет.");
            return;
        }

        if (!Number.isInteger(value) || value < 1 || value > 5) {
            alert("Выбери оценку от 1 до 5.");
            return;
        }

        if (!date) {
            alert("Выбери дату оценки.");
            return;
        }

        subject.grades.push({
            id: createId(),
            value,
            date
        });

        saveData();

        gradeValue.value = "";
        gradeDate.value = getToday();

        renderAll();
    });

    function getToday() {
        const today = new Date();

        return new Date(
            today.getTime() - today.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 10);
    }

    // =====================================
    // УДАЛЕНИЕ ОЦЕНКИ
    // =====================================

    function deleteGrade(subjectId, gradeId) {
        const subject = subjects.find(
            item => item.id === subjectId
        );

        if (!subject) return;

        subject.grades = subject.grades.filter(
            grade => grade.id !== gradeId
        );

        saveData();
        renderAll();
    }

    // =====================================
    // ОТОБРАЖЕНИЕ ОЦЕНОК
    // =====================================

    function renderGrades() {
        if (!gradeList) return;

        gradeList.replaceChildren();

        const grades = getAllGrades().sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        if (gradeListCount) {
            gradeListCount.textContent = grades.length;
        }

        if (grades.length === 0) {
            gradeList.appendChild(
                createElement(
                    "p",
                    "empty-message",
                    "Оценок пока нет."
                )
            );

            return;
        }

        grades.forEach(item => {
            const row = createElement("article", "grade-row");

            const mark = createElement(
                "strong",
                "grade-mark",
                item.value
            );

            const info = createElement("div", "grade-info");

            const subject = createElement(
                "span",
                "grade-subject",
                item.subjectName
            );

            const label = createElement(
                "span",
                "grade-label",
                "Оценка по предмету"
            );

            info.append(subject, label);

            const date = createElement(
                "span",
                "grade-date",
                formatDate(item.date)
            );

            const remove = createElement(
                "button",
                "quiet-button",
                "×"
            );

            remove.type = "button";
            remove.setAttribute("aria-label", "Удалить оценку");

            remove.addEventListener("click", () => {
                deleteGrade(item.subjectId, item.id);
            });

            row.append(mark, info, date, remove);
            gradeList.appendChild(row);
        });
    }

    // =====================================
    // ПОСЛЕДНИЕ ОЦЕНКИ НА ГЛАВНОЙ
    // =====================================

    function renderRecentGrades() {
        if (!recentGrades) return;

        recentGrades.replaceChildren();

        const grades = getAllGrades()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);

        if (grades.length === 0) {
            recentGrades.appendChild(
                createElement(
                    "p",
                    "empty-message",
                    "Здесь пока пусто. Добавь свою первую оценку!"
                )
            );

            return;
        }

        grades.forEach(item => {
            const row = createElement(
                "div",
                "recent-grade-row"
            );

            const subject = createElement(
                "span",
                "recent-grade-subject",
                item.subjectName
            );

            const mark = createElement(
                "strong",
                "grade-mark",
                item.value
            );

            const date = createElement(
                "span",
                "recent-grade-date",
                formatDate(item.date)
            );

            row.append(subject, mark, date);
            recentGrades.appendChild(row);
        });
    }

    // =====================================
    // СТАТИСТИКА
    // =====================================

    function updateStatistics() {
        const grades = getAllGrades();
        const average = getAverage(grades);

        if (subjectCount) {
            subjectCount.textContent = subjects.length;
        }

        if (gradeCount) {
            gradeCount.textContent = grades.length;
        }

        if (averageGrade) {
            averageGrade.textContent = average === null
                ? "—"
                : average.toFixed(2);
        }

        if (forecastAverage) {
            forecastAverage.textContent = average === null
                ? "—"
                : average.toFixed(2);
        }

        if (forecastMessage) {
            if (average === null) {
                forecastMessage.textContent =
                    "Добавь оценки, чтобы увидеть свой прогноз.";
            } else if (average >= 4.5) {
                forecastMessage.textContent =
                    "Отличный результат! Продолжай в том же духе.";
            } else if (average >= 3.5) {
                forecastMessage.textContent =
                    "Хороший результат. Продолжай заниматься!";
            } else if (average >= 2.5) {
                forecastMessage.textContent =
                    "Есть возможность улучшить результат.";
            } else {
                forecastMessage.textContent =
                    "Продолжай учиться, шаг за шагом результат станет лучше.";
            }
        }
    }

    // =====================================
    // ПРОГНОЗ ПО ПРЕДМЕТАМ
    // =====================================

    function renderSubjectForecast() {
        if (!subjectForecast) return;

        subjectForecast.replaceChildren();

        if (subjects.length === 0) {
            subjectForecast.appendChild(
                createElement(
                    "p",
                    "empty-message",
                    "Здесь появится статистика по предметам."
                )
            );

            return;
        }

        subjects.forEach(subject => {
            const row = createElement(
                "div",
                "forecast-item"
            );

            const name = createElement(
                "span",
                "forecast-subject-name",
                subject.name
            );

            const average = getAverage(subject.grades);

            const value = createElement(
                "strong",
                "forecast-subject-average",
                average === null ? "—" : average.toFixed(2)
            );

            row.append(name, value);
            subjectForecast.appendChild(row);
        });
    }

    // =====================================
    // ПРОФИЛЬ
    // =====================================

    function renderProfile() {
        if (profileName) {
            profileName.textContent = profile.name || "Мой профиль";
        }

        if (profileEmail) {
            profileEmail.textContent = profile.email
                ? profile.email
                : "Войди или зарегистрируйся, чтобы настроить профиль.";
        }
    }

    // =====================================
    // ОКНО АВТОРИЗАЦИИ
    // =====================================

    const authOverlay = get("authOverlay");
    const openAuth = get("openAuth");
    const closeAuth = get("closeAuth");

    const loginForm = get("loginForm");
    const registerForm = get("registerForm");

    const loginMessage = get("loginMessage");
    const registerMessage = get("registerMessage");

    const authTabs = document.querySelectorAll(".auth-tab");

    function showAuth() {
        if (!authOverlay) return;

        authOverlay.hidden = false;
        switchAuth("login");
    }

    function hideAuth() {
        if (!authOverlay) return;

        authOverlay.hidden = true;
    }

    function switchAuth(mode) {
        const isLogin = mode === "login";

        if (loginForm) loginForm.hidden = !isLogin;
        if (registerForm) registerForm.hidden = isLogin;

        authTabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.auth === mode
            );
        });
    }

    openAuth?.addEventListener("click", showAuth);
    profileAuthButton?.addEventListener("click", showAuth);
    closeAuth?.addEventListener("click", hideAuth);

    authOverlay?.addEventListener("click", event => {
        if (event.target === authOverlay) {
            hideAuth();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && authOverlay && !authOverlay.hidden) {
            hideAuth();
        }
    });

    authTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            switchAuth(tab.dataset.auth);
        });
    });

    // =====================================
    // РЕГИСТРАЦИЯ — ДЕМО-РЕЖИМ
    // =====================================

    registerForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = get("registerName")?.value.trim();
        const email = get("registerEmail")?.value.trim();
        const password = get("registerPassword")?.value;
        const repeatPassword = get("registerPasswordRepeat")?.value;

        if (!name || !email || !password || !repeatPassword) {
            registerMessage.textContent = "Заполни все поля.";
            return;
        }

        if (password.length < 8) {
            registerMessage.textContent =
                "Пароль должен содержать минимум 8 символов.";
            return;
        }

        if (password !== repeatPassword) {
            registerMessage.textContent = "Пароли не совпадают.";
            return;
        }

        profile.name = name;
        profile.email = email;

        saveData();
        renderProfile();

        registerMessage.textContent =
            "Данные профиля сохранены. Для настоящей регистрации нужно подключить сервер.";

        registerForm.reset();
    });

    // =====================================
    // ВХОД — ДЕМО-РЕЖИМ
    // =====================================

    loginForm?.addEventListener("submit", event => {
        event.preventDefault();

        const email = get("loginEmail")?.value.trim();
        const password = get("loginPassword")?.value;

        if (!email || !password) {
            loginMessage.textContent =
                "Заполни электронную почту и пароль.";
            return;
        }

        loginMessage.textContent =
            "Форма заполнена. Для настоящего входа нужно подключить сервер.";
    });

    // =====================================
    // ОБНОВЛЕНИЕ ВСЕЙ СТРАНИЦЫ
    // =====================================

    function renderAll() {
        renderSubjects();
        renderGradeSubjects();
        renderGrades();
        renderRecentGrades();
        updateStatistics();
        renderSubjectForecast();
        renderProfile();
    }

    // =====================================
    // ПЕРВЫЙ ЗАПУСК
    // =====================================

    if (gradeDate) {
        gradeDate.value = getToday();
    }

    renderAll();
});
