import sections from "../../data/sections.json" with { type: "json" };
import questions from "../../data/questions.json" with { type: "json" };

const WARNING =
    "WARNING! You're about to delete all saved data. This action CANNOT BE UNDONE. The page will refresh, the question and choice order will be randomized, and your selected choices will be reset. Press OK to continue.";
const DEBUG = false;
const DEBUG_QUESTION_ID = undefined;

class ExamUI extends HTMLElement {
    shadow;
    page;
    questionOrder;

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.shadow.append(document.getElementById("examUI").content.cloneNode(true));
        this.readLocalStorage();
        if (this.page < questions.length) {
            this.shadow.appendChild(document.createElement("exam-question"));
            this.renderQuestion();
        } else {
            this.shadow.appendChild(document.createElement("exam-results"));
            this.renderResults();
        }
        this.initButtonHandlers();
        this.updateButtonState();
        this.initControls();
    }

    readLocalStorage() {
        this.page = localStorage.getItem("page") || 0;
        this.questionOrder = localStorage.getItem("questionOrder");
        this.questionOrder = this.questionOrder ? JSON.parse(this.questionOrder) : this.randomizedOrder;
    }

    saveLocalStorage() {
        localStorage.setItem("page", this.page);
    }

    resetProgress() {
        if (!confirm(WARNING)) return;
        localStorage.clear();
        location.reload();
    }

    get randomizedOrder() {
        const randomized = [];
        const normalOrder = [];
        for (let i = 0; i < questions.length; i++) {
            normalOrder.push(i);
        }

        // Do not randomize question order when DEBUG is true
        if (DEBUG) {
            localStorage.setItem("questionOrder", JSON.stringify(normalOrder));
            return normalOrder;
        }

        while (normalOrder.length > 0) {
            const randomIndex = Math.floor(Math.random() * normalOrder.length);
            randomized.push(normalOrder.splice(randomIndex, 1)[0]);
        }
        localStorage.setItem("questionOrder", JSON.stringify(randomized));
        return randomized;
    }

    renderQuestion() {
        const examQuestion = this.shadow.querySelector("exam-question");
        examQuestion.setAttribute("index", this.questionOrder[this.page]);

        // Display a specific question with DEBUG_QUESTION_ID
        if (DEBUG_QUESTION_ID) {
            examQuestion.setAttribute("index", DEBUG_QUESTION_ID);
        }

        this.saveLocalStorage();
    }

    initButtonHandlers() {
        this.shadow.querySelectorAll("[id^='prevButton']").forEach((button) => {
            button.onclick = this.handlePrev.bind(this);
        });
        this.shadow.querySelectorAll("[id^='nextButton']").forEach((button) => {
            button.onclick = this.handleNext.bind(this);
        });
        this.shadow.getElementById("resetButton").onclick = this.resetProgress.bind(this);
    }

    updateButtonState() {
        const prevDisabled = this.page == 0;
        const nextDisabled = this.page >= questions.length;
        this.shadow.querySelectorAll("[id^='prevButton']").forEach((button) => (button.disabled = prevDisabled));
        this.shadow.querySelectorAll("[id^='nextButton']").forEach((button) => (button.disabled = nextDisabled));
    }

    initControls() {
        document.onkeydown = (event) => {
            if (event.code == "ArrowRight") {
                this.handleNext();
            } else if (event.code == "ArrowLeft") {
                this.handlePrev();
            }
        };
    }

    handlePrev() {
        this.page--;
        if (this.page < 0) {
            this.page++;
            return;
        }

        if (this.page == questions.length - 1) {
            const oldChild = this.shadow.querySelector("exam-results");
            const newChild = document.createElement("exam-question");
            this.shadow.replaceChild(newChild, oldChild);
        }
        this.renderQuestion();
        this.updateButtonState();
        window.scrollTo({ top: 0, behavior: "instant" });
    }

    handleNext() {
        this.page++;
        if (this.page > questions.length) {
            this.page--;
            return;
        }

        if (this.page == questions.length) {
            const oldChild = this.shadow.querySelector("exam-question");
            const newChild = document.createElement("exam-results");
            this.shadow.replaceChild(newChild, oldChild);
            this.renderResults();
        } else {
            this.renderQuestion();
        }
        this.updateButtonState();
        window.scrollTo({ top: 0, behavior: "instant" });
    }

    renderResults() {
        const PASS_THRESHOLD = 42 / 60;
        const resultsElement = this.shadow.querySelector("exam-results");
        const seletedChoices = JSON.parse(localStorage.getItem("seletedChoices"));
        const correctCounter = seletedChoices.reduce((counter, value) => counter + (value == 0 ? 1 : 0), 0);
        let unansweredCounter = seletedChoices.reduce((counter, value) => counter + (value == null ? 1 : 0), 0);
        unansweredCounter += questions.length - seletedChoices.length;
        resultsElement.innerHTML = `<h2>Summary</h2>
        <ul>
            <li><span>Overall score: </span><span>${Math.floor((correctCounter / questions.length) * 10000) / 100}%</span></li>
            <li><span>Required score: </span><span>${PASS_THRESHOLD * 100}%</span></li>
            <li><span>Questions asked: </span><span>${questions.length}</span></li>
            <li><span>Correct: </span><span>${correctCounter}</span></li>
            <li><span>Incorrect: </span><span>${questions.length - unansweredCounter - correctCounter}</span></li>
            <li><span>Skipped: </span><span>${unansweredCounter}</span></li>
            <li><span>Result: </span><span>${correctCounter / questions.length >= PASS_THRESHOLD ? `<span style="color: green">PASSED !!!</span>` : `<span style="color: #b70000;">FAILED</span>`}</span></li>
        </ul>`;
        this.saveLocalStorage();
    }
}

customElements.define("exam-ui", ExamUI);
