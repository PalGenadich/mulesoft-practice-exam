const DEBUG = false;

class ExamQuestion extends HTMLElement {
    questions;
    data;
    shadow;
    choiceRoot;
    numberOfQuestionsViewed;
    seletedChoices;

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.shadow.append(document.getElementById("examQuestion").content.cloneNode(true));
    }

    async init() {
        if (!this.questions) {
            await this.readLocalStorage();
        }
        const originalIndex = this.getAttribute("index");
        this.data = this.questions[originalIndex];

        // 0. Randomize
        if (!this.data.wasRandomized) {
            this.data.displayIndex = ++this.numberOfQuestionsViewed;
            this.data.originalIndex = originalIndex;
            this.randomizeChoices();
            this.saveLocalStorage();
        }

        // 1. Header
        this.renderQuestionHeader();

        // 2. Question content
        this.shadow.querySelector("#text").innerHTML = this.data.text;

        //3. Choices
        this.choiceRoot = this.shadow.querySelector("#choices");
        this.choiceRoot.innerHTML = "";
        this.renderChoices();
    }

    async readLocalStorage() {
        this.questions = localStorage.getItem("examQuestions");
        this.questions = this.questions
            ? JSON.parse(this.questions)
            : (await import("../../data/questions.json", { with: { type: "json" } })).default;
        this.numberOfQuestionsViewed = localStorage.getItem("numberOfQuestionsViewed") || 0;
        this.seletedChoices = localStorage.getItem("seletedChoices");
        this.seletedChoices = this.seletedChoices ? JSON.parse(this.seletedChoices) : [];
    }

    saveLocalStorage() {
        localStorage.setItem("examQuestions", JSON.stringify(this.questions));
        localStorage.setItem("numberOfQuestionsViewed", this.numberOfQuestionsViewed);
        this.saveViewedQuestions();
    }

    saveViewedQuestions() {
        localStorage.setItem("seletedChoices", JSON.stringify(this.seletedChoices));
    }

    randomizeChoices() {
        this.data.wasRandomized = true;
        this.data.choices = this.data.choices.map((el, index) => {
            return { value: el, originalIndex: index };
        });
        if (this.data.sort) {
            this.data.choices.sort((a, b) => +a.value - +b.value);
            return;
        }
        const randomizedArray = [];
        while (this.data.choices.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.data.choices.length);
            randomizedArray.push(this.data.choices.splice(randomIndex, 1)[0]);
        }
        this.data.choices = randomizedArray;
    }

    renderQuestionHeader() {
        // Show non-randomized question ID when DEBUG is true
        this.shadow.querySelector("#questionHeader").innerHTML =
            `Question${DEBUG ? ` (ID: ${this.data.originalIndex})` : ""} ${this.data.displayIndex} of ${this.questions.length}`;
    }

    renderChoices() {
        for (const [i, ch] of this.data.choices.entries()) {
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "question-choice";
            input.id = "choice" + ch.originalIndex;
            input.value = ch.originalIndex;
            input.onclick = this.handleSelection.bind(this);
            input.checked = this.seletedChoices[this.data.displayIndex - 1] == ch.originalIndex;

            const content = document.createElement("p");
            // Show non-randomized choice ID when DEBUG is true
            content.innerHTML = `${DEBUG ? ` (ID: ${ch.originalIndex})&emsp;` : ""}${ch.value}`;

            const labelContainer = document.createElement("label");
            labelContainer.setAttribute("for", input.id);
            labelContainer.appendChild(input);
            labelContainer.appendChild(content);
            this.choiceRoot.appendChild(labelContainer);
        }
    }

    handleSelection(event) {
        this.seletedChoices[this.data.displayIndex - 1] = +event.target.value;
        this.saveViewedQuestions();
    }

    static get observedAttributes() {
        return ["index"];
    }

    attributeChangedCallback(property, oldValue, newValue) {
        if (oldValue === newValue) return;
        this[property] = newValue;
        if (property == "index") {
            this.init();
        }
    }
}

customElements.define("exam-question", ExamQuestion);
