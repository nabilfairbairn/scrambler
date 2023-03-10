import {puzzles} from "./puzzles.js";

const wordrow_id_prefix = 'guess_number_';
var blurred;
const start_date = new Date('2023-02-26')
const date_today = new Date()
const oneDay = 1000 * 60 * 60 * 24;
var guesses_made = 0;

var puzzle_index = (days_between(start_date, date_today) - 1) % puzzles.length
var [words, answers] = puzzles[puzzle_index]

var max_wordlength = 0;
    words.forEach((word) => {
        max_wordlength = Math.max(max_wordlength, word.length)
    })
let optimal_game_w = 85; //vw
let w_per_word = optimal_game_w / max_wordlength;
let word_buffer = w_per_word / 8;
let word_w = word_buffer * 6;

let max_px = 22;
let w_per_word_px = max_px / max_wordlength;
let word_buffer_px = w_per_word_px / 8;
let word_w_px = word_buffer_px * 6

var r = document.querySelector(':root')
r.style.setProperty('--letterBoxHeight', `min(${word_w}vw, ${word_w_px}cm)`)
const letterBoxHeight = getComputedStyle(r).getPropertyValue('--letterBoxHeight')
const letterBoxMargin = `min(${word_buffer}vw, ${word_buffer_px}cm)` 


/*
text-shadow from smooth-16 was created with steps = 16
*/
function calculateStrokeTextCSS(steps) {
    var css = "";
    for (var i = 0; i < steps; i++) {
      var angle = (i * 2 * Math.PI) / steps;
      var cos = Math.round(10000 * Math.cos(angle)) / 10000;
      var sin = Math.round(10000 * Math.sin(angle)) / 10000;
      css +=
        `calc(var(--stroke-width) * ` +
        cos +
        ") calc(var(--stroke-width) * " +
        sin +
        ") 0 var(--stroke-color),";
    }
  
    return css;
  }

// TODO: Pressing Enter triggers Guess
// Typing a letter focuses the next letterInput
// Typing a letter keeps the last letter
function days_between(StartDate, EndDate) {
    // The number of milliseconds in all UTC days (no DST)
    
  
    // A day in UTC always lasts 24 hours (unlike in other time formats)
    const start = Date.UTC(EndDate.getFullYear(), EndDate.getMonth(), EndDate.getDate());
    const end = Date.UTC(StartDate.getFullYear(), StartDate.getMonth(), StartDate.getDate());
  
    // so it's safe to divide by 24 hours
    return (start - end) / oneDay;
  }

function limit(element, key) {
    element.innerText = key.toUpperCase()
    determine_local_changed_letters(element)
    setTimeout(function(){focus_next_letter(element)},80)
}

function delete_letter(element) {
    element.innerText = ''
    determine_local_changed_letters(element)
}

function focus_next_letter(element, event) {
    // If event wasn't a letter input, don't focus next letter
    if (event && (event.which < 65 || event.which > 90)) {
        return
    }

    var depth = element.getAttribute('depth')
    var order = element.getAttribute('order')
    var word = document.getElementById(wordrow_id_prefix + depth.toString())
    var next_letter;

    var word_letters = Array.from(word.querySelectorAll(`.letterInput`))
    .filter(el => Number(el.getAttribute('order')) > order)
    if (word_letters.length > 0) {
        next_letter = word_letters[0]
    } 
    depth++;
    word = document.getElementById(wordrow_id_prefix + depth.toString())
    while (!next_letter && word) {
        
        word_letters = word.querySelectorAll(`.letterInput`)
        if (word_letters) {
            next_letter = word_letters.item(0) //nodelist accessor 
        }
        
        depth++;
        let next_word_id = wordrow_id_prefix + depth.toString()
        word = document.getElementById(next_word_id)
    }
    if (next_letter) {
        next_letter.focus()    
    }
}

function process_input(element, event) {
    // Remove extra letters
    if (typeof event === "string") {
        switch(event) {
            case 'backspace':
                delete_letter(element);
                break;
            case 'keyboard_return':
                process_guess();
                return;
            default:
                limit(element, event)
                /*focus_next_letter(element)*/
                break
        }
    } else {
        if (65 <= event.which && event.which <= 90) {
            let key = event.key
            limit(element, key)
            
            /*element.blur()*/
        }
        if (event.code === 'Backspace' || event.code === 'Delete') {
            delete_letter(element)
        }
    }

    
    // Remove letter styling if 'missing'
    remove_letter_style(element)
    
    // Get parent word
    var depth = element.getAttribute('depth')
    var word = document.getElementById(wordrow_id_prefix + depth.toString())

    
    // remove word style
    remove_word_style(word)
    
    // remove word style from later words
    depth++
    while (depth < words.length) {
        const [next_word, ng, na] = get_depth(depth) 
        remove_word_style(next_word)
        depth++
    }
    
}

function count_letters(str){
    let outp_map = create_count_map(str);
    for (let i = 0 ; i < str.length ;i++) {
        let k = outp_map.get(str[i]);
        outp_map.set(str[i], k+1);
    }
    return outp_map;
}
     
//function create map to count character
function create_count_map(str) {
    // map for storing count values
    let ans = new Map();
    for(let i = 0 ; i < str.length; i++)
    {
      ans.set(str[i], 0);
    }
    return ans;   
}

//function return true or false if word1 and word2 have only 1 letter difference
function one_letter_diff(word1, word2) {
    let w1_dict = count_letters(word1);
    let w2_dict = count_letters(word2);
    let net_letters = new Map();
    for (const [key, value] of w1_dict) {
        if (w2_dict.has(key)) {
            let difference = w2_dict.get(key) - value
            net_letters.set(key, difference)
        } else {
            net_letters.set(key, -value)
        }
    }
    for (const [key, value] of w2_dict) {
        if (!(net_letters.has(key))) {
            net_letters.set(key, value)
        }
    }
    let plus_one = 0
    let minus_one = 0
    for (const [key, value] of net_letters) {
        if (value > 0) {
            plus_one += value
        }
        if (value < 0) {
            minus_one += value
        }
    }
    return (plus_one == 1 && minus_one == -1)
}

function determine_all_changed_letters() {
    for (let i = 0; i < words.length; i++) {
        determine_changed_letters(i)
    }
}

function determine_local_changed_letters(element) {
    var el_depth = element.getAttribute('depth')

    // function already ignored depths out of range of prev and next words
    // remove removed from above
    // remove all from this
    // remove added from below
    var prev = document.getElementById(wordrow_id_prefix + (el_depth-1).toString())
    if (prev) {
        remove_changed_styling(prev, 'removed')
        determine_changed_letters(el_depth-1)
    }

    remove_changed_styling(document.getElementById(wordrow_id_prefix + (el_depth).toString()))
    determine_changed_letters(el_depth)

    var next = document.getElementById(wordrow_id_prefix + (parseFloat(el_depth)+1).toString())
    if (next) {
        remove_changed_styling(next, 'added')
        determine_changed_letters(parseFloat(el_depth)+1)
    }

}

function determine_changed_letters(depth) {
    // TODO: Remove letterAdded letterRemoved styling
    let [this_element, this_word, _] = get_depth(depth)
    let prev_word = depth - 1 < 0 ? null : get_word(depth-1)
    let next_word = parseFloat(depth) + 1 >= words.length ? null : get_word(parseFloat(depth)+1)
    //console.log(prev_word, this_word, next_word)
    let this_letters_count = count_letters(this_word)
    if (next_word) {
        let next_letters_count = count_letters(next_word)
        var removed_letters = new Map();
        var total_letters = 0;

        // This word has all its letters, next was has min n-1. 
        // Calc difference between counts of each letter in this to next
        // Letters with a positive score have that many of that letter highlighted as removed
        if (!next_letters_count.has('_') && !this_letters_count.has('_')) {
            for (const [letter, val] of this_letters_count) {
                let net_val = next_letters_count.has(letter) ? val - next_letters_count.get(letter) : val
                removed_letters.set(letter, letter != '_' ? net_val : 0)
                total_letters += letter != '_' ? Math.max(net_val, 0) : 0
            } 
        } else if (!next_letters_count.has('_')) {
            for (const [letter, val] of this_letters_count) {
                if (!next_letters_count.has(letter) && letter != '_') {
                    removed_letters.set(letter, val)
                    total_letters += parseFloat(val)
                }
            }   
            if (total_letters == 0 && this_letters_count.get('_') == 1) {
                removed_letters.set('_', 1)
                total_letters += 1
            }
        }
        for (let [letter, val] of removed_letters) {
            add_changed_letter_styling(this_element, letter, val, 'letterRemoved')
            if (total_letters > 1) {
                add_changed_letter_styling(this_element, letter, val, 'bad')
            }
        }
    }

    if (prev_word) {
        let prev_letters_count = count_letters(prev_word)
        // prev word has all letters
        var added_letters = new Map() 
        var total_letters = 0
        if (!prev_letters_count.has('_')) {
            for (const [letter, val] of this_letters_count) {
                if ((!prev_letters_count.has(letter) || this_letters_count.get(letter) > prev_letters_count.get(letter)) && letter != '_') {
                    let net_val = prev_letters_count.has(letter) ? val - prev_letters_count.get(letter) : val
                    added_letters.set(letter, net_val)
                    total_letters += letter != '_' ? Math.max(net_val, 0) : 0
                }
            }
        }
        for (let [letter, val] of added_letters) {
            add_changed_letter_styling(this_element, letter, val, 'letterAdded')
            if (total_letters > 1) {
                add_changed_letter_styling(this_element, letter, val, 'bad')
            }
        }

    }
    
}

function add_changed_letter_styling(element, letter, val, classToAdd) {
    var word_letters = element.querySelectorAll('.letterBox')
    word_letters.forEach((word_letter) => {
        if ((word_letter.innerText == letter || (word_letter.innerText == '' && letter == '_')) && val > 0) {
            word_letter.classList.add(classToAdd)
            val--;
        }
    })
}

function remove_changed_styling(wordrow, changetype) {
    //added removed
    var word_letters = wordrow.querySelectorAll('.letterBox')
    word_letters.forEach((word_letter) => {
        if (!changetype || changetype == 'removed') {
            word_letter.classList.remove('letterRemoved')
        } 
        if (!changetype || changetype == 'added') {
            word_letter.classList.remove('letterAdded')
        }
        word_letter.classList.remove('bad')
    })
}

function get_depth(d) {
  let guessid = wordrow_id_prefix + d.toString()
  let guess_word = document.getElementById(guessid)
  const answer_words = answers[d]
  const guess_letters = guess_word.querySelectorAll('.letterBox')
  var guess_received = ''

  guess_letters.forEach((letter_box) => {

    let letter_text = letter_box.innerText.toUpperCase()
    guess_received += letter_text ? letter_text : '_'
    
  })
  return [guess_word, guess_received, answer_words]
}

function reaches_word(thisword, thisdepth, wuc, wuc_depth) {
    let joined_words = []
    answers[thisdepth].forEach((word) => {
        if (one_letter_diff(thisword, word)) {
            joined_words.push(word)
        }
    })
    if (thisdepth == wuc_depth) {
        return joined_words.includes(wuc)
    } else {
        let reaches = true
        joined_words.forEach((word) => {
            if (!reaches_word(word, thisdepth+1, wuc, wuc_depth)) {
                reaches = false
                return false
            }
        })
        return reaches
    }
} 

function get_word(word_number) {
    let [guess_word, guess_received, answer_words] = get_depth(word_number)
    return guess_received
}

function word_exists(word, answer_list) {
    return answer_list.includes(word)
}

function word_complete(word, answer_list) {
    return (word.length == answer_list[0].length && !word.includes('_'))
}

function word_depth(wordrow) {
  let wordrow_id = wordrow.id
  let depth_str = wordrow_id.slice(wordrow_id_prefix.length, wordrow_id.length)
  let depth = parseInt(depth_str)
  return depth
}

function word_attempted(wordrow) {
  const guess_letters = wordrow.querySelectorAll('.letterInput')
  if (guess_letters.length == 0) {return true}

  var attempted = false

  guess_letters.forEach((letter_box) => {
    let letter = letter_box.innerText
    if (!(letter == null || letter == '')) {
        attempted = true
        return false
    }
  })
  return attempted
}
                        

function is_word_valid(guess_word, guess_received, answer_words, valid_depths) {
    // empty
    if (!word_attempted(guess_word)) {
        return 0
    }
    // not full guess
    if (!word_complete(guess_received, answer_words)) {
        return -1
    }
    // not in depth answers
    if (!word_exists(guess_received, answer_words)) {
        return -2
    }
    
    let depth = word_depth(guess_word)
    
    // (word complete, and in answers)
    // first word
    if (depth == 0) {
        return 1
    }
    // Only answer
    if (answer_words.length == 1) {
        return 1
    }
    // 
    // Prev word valid?
    if (valid_depths[depth-1]) {
        // obeys rule
        if (one_letter_diff(guess_received, get_word(depth-1))) {
            return 1
        }
    }
    // (prev_word not valid)
    // Does closest valid word join this word?
      
    let nearest_valid_depth = -1
    let i = depth
    while (nearest_valid_depth == -1 && i > 0) {
        nearest_valid_depth = valid_depths[i] ? i : nearest_valid_depth;
        i--;
    }
    let valid_word = get_word(nearest_valid_depth)
    if (reaches_word(valid_word, nearest_valid_depth, guess_received, depth)) {
        return 1
    }
    return 0
}

function puzzle_done(valid_words) {
    let done = true
    valid_words.forEach((validity) => {
        if (!validity) {
            done = false
            return false
        }
    })
    return done
}
    
function style_guessword(wordrow, validity) {
    // 0: unattempted, 1: correct, -1: incomplete, -2: wrong
    switch(validity) {
        case 1:
            wordrow.classList.add('correct')
            break;
        case -2:
            wordrow.classList.add('wrong')
        case -1:
            const guess_letters = wordrow.querySelectorAll('.letterInput')
            guess_letters.forEach((letterbox) => {
                if (letterbox.innerText == null || letterbox.innerText == '') {
                    letterbox.classList.add('missing')
                }
            })
            break;
            
    }
}
    
function remove_word_style(wordrow) {
    wordrow.classList.remove('correct', 'wrong')
}

function remove_letter_style(letterbox) {
    letterbox.classList.remove('missing')
}

function remove_all_word_style() {
    const wordrows = document.querySelectorAll('.wordRow')
    wordrows.forEach((wordrow) => {
        remove_word_style(wordrow)
        const letters = wordrow.querySelectorAll('.letterInput')
        letters.forEach(letter => remove_letter_style(letter))
    })
}

function process_guess() {
    guesses_made++;
    document.getElementById('guesses_made').innerText = guesses_made

    var focused_element = null;
    if (
        document.hasFocus() &&
        document.activeElement !== document.body &&
        document.activeElement !== document.documentElement
    ) {
        focused_element = document.activeElement;
    }
    if (focused_element) {
        focused_element.blur()
    }

    remove_all_word_style()
    var printing = ''
    var actual_answer = ''
    var curr_input_id = 0
    
    var valid_depths = []

    var one_letter_diff_shown = false
    var rule_break_notice;
    
    for (let w = 0; w < words.length; w++) {
      const [guess_word, guess_received, answer_words] = get_depth(w)
      let validity_status = is_word_valid(guess_word, guess_received, answer_words, valid_depths) //-2 is invalid, -1 is incomplete, 0 is unattempted, 1 is valid
      valid_depths.push(validity_status == 1 ? true : false)

      style_guessword(guess_word, validity_status)
      
      // If !one-letter-diff-shown and w < words.length-1 and w and w+1 are complete, check one-letter-diff. If violated, one-letter-diff-shown and show rule
      if (!one_letter_diff_shown && w < words.length -1) {
        const [next_word, next_received, next_answers] = get_depth(w+1)
        if (word_complete(guess_received, answer_words) && word_complete(next_received, next_answers)) {
            if (!one_letter_diff(guess_received, next_received)) {
                one_letter_diff_shown = true
                rule_break_notice = `Careful! You changed more than one letter between ${guess_received} and ${next_received}.`
            }
        }
      }
      
    }
    // If all words are valid and correct
    if (!valid_depths.some(x => x === false)) {
        document.getElementById('rowHolder').classList.add('finished')
    }

    var right_wrong = (puzzle_done(valid_depths)) ? "That's right!" : "Try again.";


    var hiding = document.getElementById("button_response")
    hiding.innerText = rule_break_notice ? rule_break_notice : right_wrong;
    hiding.style.visibility = "visible";
  }

function style_letterBox(element) {
    
    element.style.width = letterBoxHeight
    element.style.height = letterBoxHeight
    element.style.margin = letterBoxMargin


}

window.onload = function() {
  document.getElementById('guesses_made').innerText = guesses_made
  var input_id_answer = {}
  var input_id = 0
  var input_id_prefix = "user_input_"

  var openModalButtons = document.getElementById('modalbutton')
  var closeModalButtons = document.getElementById('closemodalbutton')
  var overlay = document.getElementById('overlay')

  var modal = document.getElementById('modal')

  var keyboardbutton = document.getElementById('keyboardbutton')
  keyboardbutton.onclick = function() {
    var keyboard = document.getElementById('keyboard-cont')
    if (keyboard.style.display == 'none') {
        keyboard.style.display = 'flex'
    } else {
        keyboard.style.display = 'none'
    }
  }

  const keyboard_keys = document.querySelectorAll('.keyboard-button')
  keyboard_keys.forEach((key) => {
    key.onclick = function(event) {
        event.preventDefault();
        const key_val = key.innerText
        blurred.focus()
        process_input(blurred, key_val)
    }
  })

  function openModal() {
    if (modal == null) {
      console.log('Couldnt find modal?')
      return
    }
    modal.classList.remove('closed')
    overlay.classList.remove('closed')
  }

  function closeModal() {
    if (modal == null) {
      console.log('Couldnt find modal?')
      return
    }
    modal.classList.add('closed')
    overlay.classList.add('closed')
  }

  openModalButtons.onclick = openModal 
  overlay.onclick = closeModal 
  closeModalButtons.onclick = closeModal 

  document.addEventListener("keyup", function(event) {
    if (event.key === 'Enter' && document.activeElement.id != 'email_input') {
        process_guess()
    }
  })


  document.getElementById("answerBtn").onclick = function() {
    process_guess()
  }


  var rowHolder = document.getElementById("rowHolder")

  var n_words = words.length

  for (let i = 0; i < n_words; i++) {
    var row = document.createElement("div");
    row.className = "wordRow";
    row.id = wordrow_id_prefix + i.toString()
    

    rowHolder.appendChild(row)
    var rowWord = words[i]

    for (let j = 0; j < rowWord.length; j++) {
      var letter = rowWord[j]
      if (letter === "_") {
        let input = document.createElement("div")
        input.classList.add("letterInput")
        input.classList.add("letterBox")
        style_letterBox(input)
        input.tabIndex = i*1 + j
        input.onblur = function() {
            blurred = this;
        }
        input.onclick = function() {
            input.focus()
        }
        input.addEventListener('keydown', function myfunc(event) {
            process_input(input, event)
            /*setTimeout(function(){focus_next_letter(input, event)},80)*/
        })
        input.setAttribute('depth', i)
        input.setAttribute('order', j)

        row.appendChild(input)
      } else {
        var letter_holder = document.createElement("div")
        style_letterBox(letter_holder)
        letter_holder.className = "letterBox"
        letter_holder.innerText = letter
        row.appendChild(letter_holder)
      }
    }
  }
  determine_all_changed_letters()
}
