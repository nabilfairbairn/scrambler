class Dialogue {
    constructor(user_id) {
        // get current narrative location from database
        // get next dialogue (if any) from dialogues file
        this.next_dialogues = [`The alien opens its maw and consumes you whole.`, `Add narrative choice buttons and remove arrow button`]
    }
    getNextDialogue = () => {

        if (this.next_dialogues.length) {
            let next_dialogue = this.next_dialogues.splice(0, 1)
            return next_dialogue
        } else {
            return ''
        }
    }

    serveUpNextDialogue = () => {

        let next_dialogue = this.getNextDialogue()

        if (next_dialogue) {
            let dialogue_box = document.getElementById('narrative_dialogue')
            dialogue_box.innerText = next_dialogue

            // if no dialogue left, change arrow to X
        } else {
            // close dialogue box
            document.getElementById('narrative_box').style.display = 'none'
        }
    }

    createNarrativeChoice = (fork_id) => {
        // use fork_id to obtain available choices
        // create buttons for each of those choices
        // add buttons to dialogue_box text, with event listeners for each.
    }

    processNarrativeChoice = (fork_id, choice_id) => {
        // button contains fork_id and choice_id
        // save choice in database.
        // decide whether this is a narrative checkpoint (after a refresh, user can't be sent further back in the narrative)
        // call any necessary functions for processing the choice
    }

}

let current_dialogue = new Dialogue(3)

let campaign = {
    current_dialogue
}

export default campaign