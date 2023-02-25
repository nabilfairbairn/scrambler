const wordrow_id_prefix = 'guess_number_'
const words = ["TOUCH", "T_U__", "CO___"];
const answers = [["TOUCH"], ["TOUGH"], ["COUGH"]]
var blurred;

// TODO: Pressing Enter triggers Guess
// Typing a letter focuses the next letterInput
// Typing a letter keeps the last letter

function limit(element, key) {
    element.innerText = key.toUpperCase()
}

function delete_letter(element) {
    element.innerText = ''
}

function focus_next_letter(element, event) {
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
            case 'DEL':
                delete_letter(element);
                break;
            case 'ENTER':
                process_guess();
                return;
            default:
                limit(element, event)
                focus_next_letter(element)
                break
        }
    } else {
        if (65 <= event.which && event.which <= 90) {
            let key = event.key
            limit(element, key)
            
            element.blur()
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
    outp_map = create_count_map(str);
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
            let difference = value - w2_dict.get(key)
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

function get_depth(d) {
  let guessid = wordrow_id_prefix + d.toString()
  let guess_word = document.getElementById(guessid)
  const answer_words = answers[d]
  const guess_letters = guess_word.querySelectorAll('.letterBox')
  var guess_received = ''

  guess_letters.forEach((letter_box) => {
    
      guess_received += letter_box.innerText.toUpperCase()
    
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
    return (word.length == answer_list[0].length)
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
    remove_all_word_style()
    var printing = ''
    var actual_answer = ''
    var curr_input_id = 0
    
    var valid_depths = []

    var w;
    var one_letter_diff_shown = false
    var rule_break_notice;
    
    for (w = 0; w < words.length; w++) {
      const [guess_word, guess_received, answer_words] = get_depth(w)
      let validity_status = is_word_valid(guess_word, guess_received, answer_words, valid_depths) //-2 is invalid, -1 is incomplete, 0 is unattempted, 1 is valid
      console.log(guess_received)
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
    var right_wrong = (puzzle_done(valid_depths)) ? "That's right!" : "Try again.";

    var hiding = document.getElementById("button_response")
    hiding.innerText = rule_break_notice ? rule_break_notice : right_wrong;
    hiding.style.visibility = "visible";
  }

function style_letterBox(element) {
    var max_wordlength = 0;
    words.forEach((word) => {
        max_wordlength = Math.max(max_wordlength, word.length)
    })
    let optimal_game_w = 85; //vw
    let w_per_word = optimal_game_w / max_wordlength;
    let word_buffer = w_per_word / 8;
    let word_w = word_buffer * 6;
    element.style.width = `${word_w}vw`
    element.style.height = `${word_w}vw`

    let max_px = 22;
    let w_per_word_px = max_px / max_wordlength;
    let word_buffer_px = w_per_word_px / 8;
    let word_w_px = word_buffer_px * 6
    element.style.maxWidth = `${word_w_px}cm`
    element.style.maxHeight = `${word_w_px}cm`
    element.style.margin = `min(${word_buffer}vw, ${word_buffer_px}cm)` 
}

window.onload = function() {
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
    modal.classList.add('open')
    overlay.classList.add('open')
  }

  function closeModal() {
    if (modal == null) {
      console.log('Couldnt find modal?')
      return
    }
    modal.classList.remove('open')
    overlay.classList.remove('open')
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
            setTimeout(function(){focus_next_letter(input, event)},80)
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
}
