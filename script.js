
document.addEventListener("DOMContentLoaded", () => {
    // =====================================
    // ДАННЫЕ И СОХРАНЕНИЕ
    // =====================================

    const STORAGE_KEY = "edudiary_main";

    function loadData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (saved && Array.isArray(saved.subjects)) {
                return saved;
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
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

    let subjects = data.subjects;
    let profile = data.profile || {
        name: "Мой профиль",
        email: ""
    };

    function saveData() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ subjects, profile })
        );
    }

    function createId() {
        return Date.now() + Math.floor(Math.random() * 10000);
    }

    function formatDate(dateString) {
        if (!dateString) return "";

        const parts = dateString.split("-");

        return parts.length === 3
            ? `${parts[2]}.${parts[1]}.${parts[0]}`
            : dateString;
    }

    function getToday() {
        const date = new Date();

        return new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 10);
    }

    // =====================================
    // ЭЛЕМЕНТЫ HTML
    // =====================================

    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    const subjectForm = document.getElementById("subjectForm");
    const subjectInput = document.getElementById("subjectInput");
    const subjectList = document.getElementById("subjectList");
    const subjectListCount = document.getElementById("subjectListCount");

    const gradeForm = document.getElementById("gradeForm");
    const gradeSubject = document.getElementById("gradeSubject");
    const gradeValue = document.getElementById("gradeValue");
    const gradeDate = document.getElementById("gradeDate");
    const gradeList = document.getElementById("gradeList");
    const gradeListCount = document.getElementById("gradeListCount");

    const subjectCount = document.getElementById("subjectCount");
    const gradeCount = document.getElementById("gradeCount");
    const averageGrade = document.getElementById("averageGrade");
    const recentGrades = document.getElementById("recentGrades");

    const forecastAverage = document.getElementById("forecastAverage");
    const forecastMessage = document.getElementById("forecastMessage");
    const subjectForecast = document.getElementById("subjectForecast");

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");

    // =====================================
    // БОКОВОЕ МЕНЮ И НАВИГАЦИЯ
    // =====================================

    const navigationLinks = document.querySelectorAll(".sidebar-link");
    const sections = document.querySelectorAll(".page-section");

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.toggle(
                "active",
                section.id === sectionId
            );
        });

        navigationLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.dataset.section === sectionId
            );
        });

        if (window.innerWidth <= 800) {
            sidebar?.classList.remove("open");
        }
    }

    navigationLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            const sectionId = link.dataset.section;

            if (sectionId) {
                showSection(sectionId);
                history.replaceState(null, "", `#${sectionId}`);
            }
        });
    });

    sidebarToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("collapsed");

        const expanded =
            !sidebar?.classList.contains("collapsed");

        sidebarToggle.setAttribute(
            "aria-expanded",
            String(expanded)
        );
    });

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
    // ПРЕДМЕТЫ
    // =====================================

    subjectForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = subjectInput.value.trim();

        if (!name) {
            subjectInput.focus();
            return;
        }

        const alreadyExists = subjects.some(subject =>
            subject.name.toLowerCase() === name.toLowerCase()
        );

        if (alreadyExists) {
            alert("Такой предмет уже добавлен.");
            return;
        }

        subjects.push({
            id: createId(),
            name,
            grades: []
        });

        subjectInput.value = "";

        saveData();
        renderAll();
        subjectInput.focus();
    });

    function deleteSubject(id) {
        const subject = subjects.find(item => item.id === id);

        if (!subject) return;

        const confirmed = confirm(
            `Удалить предмет «${subject.name}» и все его оценки?`
        );

        if (!confirmed) return;

        subjects = subjects.filter(item => item.id !== id);

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
            const message = document.createElement("p");
            message.className = "empty-message";
            message.textContent = "Ты ещё не добавил(а) предметы.";

            subjectList.appendChild(message);
        }

        subjects.forEach(subject => {
            if (!Array.isArray(subject.grades)) {
                subject.grades = [];
            }

            const item = document.createElement("article");
            item.className = "subject-item";

            const heading = document.createElement("div");
            heading.className = "subject-item-heading";

            const title = document.createElement("h3");
            title.textContent = subject.name;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "quiet-button";
            deleteButton.textContent = "Удалить";

            deleteButton.addEventListener("click", () => {
                deleteSubject(subject.id);
            });

            heading.append(title, deleteButton);

            const info = document.createElement("p");
            info.textContent = `Количество оценок: ${subject.grades.length}`;

            item.append(heading, info);
            subjectList.appendChild(item);
        });

        updateGradeSubjectOptions();
    }

    // =====================================
    // СПИСОК ПРЕДМЕТОВ В ФОРМЕ ОЦЕНОК
    // =====================================

    function updateGradeSubjectOptions() {
        if (!gradeSubject) return;

        const previousValue = gradeSubject.value;

        gradeSubject.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = subjects.length
            ? "Выбери предмет"
            : "Сначала добавь предмет";

        gradeSubject.appendChild(placeholder);

        subjects.forEach(subject => {
            const option = document.createElement("option");
            option.value = String(subject.id);
            option.textContent = subject.name;

            gradeSubject.appendChild(option);
        });

        if (subjects.some(
            subject => String(subject.id) === previousValue
        )) {
            gradeSubject.value = previousValue;
        }
    }

    // =====================================
    // ДОБАВЛЕНИЕ ОЦЕНОК
    // =====================================

    gradeDate.value = getToday();

    gradeForm?.addEventListener("submit", event => {
        event.preventDefault();

        const subject = subjects.find(
            item => String(item.id) === gradeSubject.value
        );

        if (!subject) {
            alert("Сначала выбери предмет.");
            return;
        }

        const value = Number(gradeValue.value);
        const date = gradeDate.value;

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

        gradeValue.value = "";
        gradeDate.value = getToday();

        saveData();
        renderAll();
    });

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
    // ИСТОРИЯ ОЦЕНОК
    // =====================================

    function getAllGrades() {
        return subjects.flatMap(subject =>
            subject.grades.map(grade => ({
                ...grade,
                subjectId: subject.id,
                subjectName: subject.name
            }))
        );
    }

    function renderGrades() {
        if (!gradeList) return;

        gradeList.replaceChildren();

        const grades = getAllGrades().sort(
            (a, b) => b.date.localeCompare(a.date)
        );

        if (gradeListCount) {
            gradeListCount.textContent = grades.length;
        }

        if (grades.length === 0) {
            const message = document.createElement("p");
            message.className = "empty-message";
            message.textContent = "Оценок пока нет.";

            gradeList.appendChild(message);
            return;
        }

        grades.forEach(grade => {
            const row = document.createElement("div");
            row.className = "grade-row";

            const subject = document.createElement("span");
            subject.textContent = grade.subjectName;

            const mark = document.createElement("strong");
            mark.textContent = grade.value;

            const date = document.createElement("span");
            date.textContent = formatDate(grade.date);

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "quiet-button";
            remove.textContent = "Удалить";

            remove.addEventListener("click", () => {
                deleteGrade(grade.subjectId, grade.id);
            });

            row.append(subject, mark, date, remove);
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
            const message = document.createElement("p");
            message.className = "empty-message";
            message.textContent =
                "Здесь пока пусто. Добавь свою первую оценку!";

            recentGrades.appendChild(message);
            return;
        }

        grades.forEach(grade => {
            const row = document.createElement("div");
            row.className = "recent-grade-row";

            const subject = document.createElement("span");
            subject.textContent = grade.subjectName;

            const mark = document.createElement("strong");
            mark.textContent = grade.value;

            const date = document.createElement("span");
            date.textContent = formatDate(grade.date);

            row.append(subject, mark, date);
            recentGrades.appendChild(row);
        });
    }

    // =====================================
    // СТАТИСТИКА
    // =====================================

    function updateStatistics() {
        const grades = getAllGrades();

        const sum = grades.reduce(
            (total, grade) => total + grade.value,
            0
        );

        const average = grades.length
            ? sum / grades.length
            : null;

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
    }

    // =====================================
    // ПРОГНОЗ
    // =====================================

    function renderForecast() {
        const grades = getAllGrades();

        const sum = grades.reduce(
            (total, grade) => total + grade.value,
            0
        );

        const average = grades.length
            ? sum / grades.length
            : null;

        if (forecastAverage) {
            forecastAverage.textContent = average === null
                ? "—"
                : average.toFixed(2);
        }

        if (forecastMessage) {
            if (average === null) {
                forecastMessage.textContent =
                    "Добавь оценки, чтобы увидеть свой прогноз.";
            } else {
                forecastMessage.textContent =
                    `Сейчас твой средний балл: ${average.toFixed(2)} из 5.`;
            }
        }

        if (!subjectForecast) return;

        subjectForecast.replaceChildren();

        if (subjects.length === 0) {
            const message = document.createElement("p");
            message.className = "empty-message";
            message.textContent =
                "Здесь появится статистика по предметам.";

            subjectForecast.appendChild(message);
            return;
        }

        subjects.forEach(subject => {
            const row = document.createElement("div");
            row.className = "subject-forecast-row";

            const name = document.createElement("span");
            name.textContent = subject.name;

            const subjectGrades = subject.grades || [];

            const subjectAverage = subjectGrades.length
                ? subjectGrades.reduce(
                    (total, grade) => total + grade.value,
                    0
                ) / subjectGrades.length
                : null;

            const result = document.createElement("strong");
            result.textContent = subjectAverage === null
                ? "Нет оценок"
                : subjectAverage.toFixed(2);

            row.append(name, result);
            subjectForecast.appendChild(row);
        });
    }

    // =====================================
    // ОКНО ВХОДА И РЕГИСТРАЦИИ
    // =====================================

    const authOverlay = document.getElementById("authOverlay");
    const openAuth = document.getElementById("openAuth");
    const profileAuthButton = document.getElementById("profileAuthButton");
    const closeAuth = document.getElementById("closeAuth");

    const authTabs = document.querySelectorAll(".auth-tab");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    function openAuthWindow() {
        if (authOverlay) {
            authOverlay.hidden = false;
        }
    }

    function closeAuthWindow() {
        if (authOverlay) {
            authOverlay.hidden = true;
        }
    }

    openAuth?.addEventListener("click", openAuthWindow);
    profileAuthButton?.addEventListener("click", openAuthWindow);
    closeAuth?.addEventListener("click", closeAuthWindow);

    authOverlay?.addEventListener("click", event => {
        if (event.target === authOverlay) {
            closeAuthWindow();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeAuthWindow();
        }
    });

    function switchAuthTab(tabName) {
        authTabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.auth === tabName
            );
        });

        if (loginForm) {
            loginForm.hidden = tabName !== "login";
        }

        if (registerForm) {
            registerForm.hidden = tabName !== "register";
        }

        if (loginMessage) loginMessage.textContent = "";
        if (registerMessage) registerMessage.textContent = "";
    }

    authTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            switchAuthTab(tab.dataset.auth);
        });
    });

    // Регистрация в демонстрационном режиме.
    // Пароль намеренно не сохраняется в браузере.

    registerForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const repeatPassword =
            document.getElementById("registerPasswordRepeat").value;

        if (!name || !email || !password || !repeatPassword) {
            registerMessage.textContent =
                "Заполни все поля.";
            return;
        }

        if (password.length < 8) {
            registerMessage.textContent =
                "Пароль должен содержать минимум 8 символов.";
            return;
        }

        if (password !== repeatPassword) {
            registerMessage.textContent =
                "Пароли не совпадают.";
            return;
        }

        profile = { name, email };

        saveData();
        renderProfile();

        registerMessage.textContent =
            "Профиль создан в демонстрационном режиме!";

        registerForm.reset();
    });

    // Настоящая проверка аккаунта требует серверной части.

    loginForm?.addEventListener("submit", event => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();

        if (profile.email && profile.email === email) {
            loginMessage.textContent =
                "Профиль найден на этом устройстве. Для настоящего входа нужен сервер.";
        } else {
            loginMessage.textContent =
                "Это демонстрационная версия. Настоящий вход появится после подключения сервера.";
        }
    });

    // =====================================
    // ОБНОВЛЕНИЕ СТРАНИЦЫ
    // =====================================

    function renderAll() {
        renderSubjects();
        renderGrades();
        renderRecentGrades();
        updateStatistics();
        renderForecast();
        renderProfile();
    }

    // Начальная настройка

    if (gradeDate) {
        gradeDate.value = getToday();
    }

    const initialSection = window.location.hash.slice(1);

    if (initialSection && document.getElementById(initialSection)) {
        showSection(initialSection);
    }

    renderAll();
});
