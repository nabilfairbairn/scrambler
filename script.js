// import { setgid } from "process";
import {puzzles} from "./puzzles.js";

const api_url_base = 'https://scrambler-api.onrender.com'
const wordrow_id_prefix = 'guess_number_';
var blurred;
const start_date = new Date('2023-02-26')
const date_today = new Date()
const oneDay = 1000 * 60 * 60 * 24;

const version = 'V1.0.3'


history.scrollRestoration = "manual";
window.onbeforeunload = function(){
      window.scrollTop(0);
};

let user = {
    'id': null,
    'username': null,
    'points': null,
    'last_version': ''
}

// all_daily_puzzles: easy/hard
// user_input: easy, hard - list of inputboxid: text pairs

// autoload easy puzzle.
// On switch, save current user_input state
// change puzzle to all_daily_puzzles easy/hard

// create puzzle, replace user_input, restyle
// on guess, pass in current_puzzle

// loadPuzzle pulls both for day
// startPuzzle needs to attempt start for both. Pull last guess for both
// User_input fed with result


let todays_puzzles = {
    'easy': null,
    'hard': null
}

let opened_hard_puzzle = false

// updated on puzzleStart
let user_states = {
    'easy': {
        'guesses_made': 0,
        'puzzle_attempt': 1,
        'last_input': [], // last guess has styling provided
        'last_guess': [],  // on change, last input should not be styled
        'word_styling': {}
    },
    'hard': {
        'guesses_made': 0,
        'puzzle_attempt': 1,
        'last_input': [],
        'last_guess': [],
        'word_styling': {}
    }
}

// current puzzle on screen
let puzzle = {
    'id': null,
    'words': null,
    'answers': null,
    'difficulty': null,
    'base_points': null
}
function getDiff() {
    var diff_scale = ['easy', 'hard']
    return diff_scale[puzzle.difficulty - 1] // 1 indexed difficulty
}
fetchPuzzle()


//var puzzle_index = (days_between(start_date, date_today) - 1) % puzzles.length
//var [words, answers] = puzzles[puzzle_index]

var max_wordlength = 0;
let optimal_game_w = 85; //vw
let w_per_word;
let word_buffer;
let word_w;

let max_px = 22;
let w_per_word_px;
let word_buffer_px;
let word_w_px;

var r = document.querySelector(':root')
var keyboard = document.getElementById('keyboard-cont')
var letterBoxHeight;
var letterBoxMargin;

// set temp in case puzzle slow to load
set_global_style_variables(['_____', '_____','_____','_____','_____',])


function set_global_style_variables(words) {
    
    words.forEach((word) => {
        max_wordlength = Math.max(max_wordlength, word.length)
    })
    w_per_word = optimal_game_w / max_wordlength;
    word_buffer = w_per_word / 8;
    word_w = word_buffer * 6;

    w_per_word_px = max_px / max_wordlength;
    word_buffer_px = w_per_word_px / 8;
    word_w_px = word_buffer_px * 6

    r.style.setProperty('--letterBoxHeight', `min(${word_w}vw, ${word_w_px}cm)`)
    letterBoxHeight = getComputedStyle(r).getPropertyValue('--letterBoxHeight')
    letterBoxMargin = `min(${word_buffer}vw, ${word_buffer_px}cm)` 
    r.style.setProperty('--letterBoxMargin', `min(${word_buffer}vw, ${word_buffer_px}cm)` )
}

async function switchDifficulty(e) {
    const source_toggle = e.target
    const new_diff = source_toggle.value
    

    if (new_diff == getDiff()) { // same difficulty clicked as current difficulty
        return
    }

    // On save input, need to isolate last guess (with styling) and preceding input
    // on reload, only put styling on last guess

    // save current Input, including word styling
    saveCurrentInput()

    // replace visible puzzle
    puzzle = todays_puzzles[new_diff]

    // clear old puzzle
    document.getElementById('rowHolder').innerHTML = ''    
    document.getElementById('rowHolder').classList.remove('finished')
    document.getElementById('answerBtn').classList.remove('finished')

    // display current puzzle
    create_puzzle()

    // if first time displaying hard, startPuzzle

    // refresh user state, load in new guess
    refreshUserInputs() // loads in last input and existing styling

    if (new_diff == 'hard' && !opened_hard_puzzle) {
        await startPuzzle()
        opened_hard_puzzle = true

        // first open of Hard puzzle. Existing input in user_states is from last_guess (if exists)
        // should be styled
        process_guess_styling(false)
    }
}


function saveCurrentInput() {
    var complete_words = [] // empty strings for incomplete words

    var valid_depths = [] // not used in this function
    
    // mirrors code from process_guess_styling
    // iterate through puzzle words, extracting words from inputs
    for (let w = 0; w < puzzle.words.length; w++) {
      const [guess_word, guess_received, answer_words] = get_depth(w)
      let validity_status = is_word_valid(guess_word, guess_received, answer_words, valid_depths) //-2 is invalid, -1 is incomplete, 0 is unattempted, 1 is valid

      if (validity_status == -2 || validity_status == 1) {
        complete_words.push(guess_received) // string
      } else {
        complete_words.push('')
      }
      
      valid_depths.push(validity_status == 1 ? true : false)

      // save classes on       
      user_states[getDiff()].word_styling[w] = [...guess_word.classList]
    }
    user_states[getDiff()].last_input = complete_words
}


function replaceOffscreenTooltip(e) {
    const tooltip = e.target || e.srcElement
    const tooltipText = tooltip.firstElementChild

    const windowWidth = window.innerWidth;
    const clientWidth = document.documentElement.clientWidth

    tooltipText.style.width = `${windowWidth * 0.6}px`

    /* tooltipText.style.display = 'block' */

    const screenPadding = 24

    tooltipText.classList.remove("placeLeft", "placeRight")

    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipTextRect = tooltipText.getBoundingClientRect();

    const tooltipTextRightX = tooltipTextRect.x + tooltipTextRect.width
    const tooltipRightX = tooltipRect.x + tooltipRect.width


    if (tooltipTextRect.x < 0) { // Tooltips leftmost point is off screen to the left
        tooltipText.classList.add("placeLeft")
    } else if (tooltipTextRightX > windowWidth) {
        tooltipText.classList.add("placeRight")
      }

}

function parseArrayWithSpaces(array) {
    const result = [];
  
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (item.includes(' ')) {
        const words = item.split(' ');
        result.push(words);
      } else {
        result.push([item]);
      }
    }
  
    return result;
  }

function declare_puzzle(httpResponse) {
    // receives json containing both easy and hard puzzles
    // assigns both daily puzzle variables
    // creates puzzle for easy

    Object.entries(httpResponse).forEach(([diff, puz]) => {
        let visible = puz['visible'] // ['THORN','__RCH','_O_C_','_RC__','_R_PS']

        let answer = puz['answer'] // ["SWORD","LORDS FORDS CORDS DORMS WARDS","LOADS ROADS","SODAS","DOSES"] -> Needs to become comma separated nested list

        let parsed_answer = parseArrayWithSpaces(answer)
        
        // assign both puzzles
        todays_puzzles[diff] = {
            'id': puz['id'],
            'words': visible,
            'answers': parsed_answer,
            'difficulty': puz['difficulty'],
            'base_points': puz['base_points']
        }
    })
    
    // set current puzzle to easy
    puzzle = todays_puzzles['easy']
    
    // hide loader
    document.getElementById('puzzle_loader').style.display = 'none'
    create_puzzle()
}

function fetchPuzzle() {
    // Get both daily puzzles

    const url = 'https://scrambler-api.onrender.com/puzzles'
    const http = new XMLHttpRequest()
    http.open("GET", url)
    http.responseType = 'json'
    http.send() // Make sure to stringify
    http.onload = function() {
        declare_puzzle(http.response) // easy and hard

        // Puzzle slow to load, user already logged in. Once puzzle done loading, send start info.
        if (user.id) {
            loadPuzzleAndGuesses()
        }
    }
}


function fetchLogin(event) {
    event.preventDefault()

    const submit_type = event.submitter.name

    var params = {
        uname: document.getElementById('uname').value,
        pword: document.getElementById('pword').value
    };
    var url = "https://scrambler-api.onrender.com/users/login"


    if (submit_type == 'create') {
        params['email'] = document.getElementById('email').value
        url = "https://scrambler-api.onrender.com/users"
    }
    document.getElementById('login_loader').style.visibility = 'visible'

    const http = new XMLHttpRequest()
    http.open("POST", url)
    http.setRequestHeader('Content-type', 'application/json')
    http.responseType = 'json'

    http.send(JSON.stringify(params)) // Make sure to stringify
    http.onload = function() {

        if (http.status >= 400) {
            // Timeout to allow loader to hide before raising alert.
            document.getElementById('login_loader').style.visibility = 'hidden'
            setTimeout(function() {
                alert(http.response['err'])
              }, 50);
            
        } else {
            setUser(http.response)
            const params = {user_id: user.id}
            fetchPostWrapper('/version/get', params, highlightVersionButton)
            displayLogin()

            // Login successful
            document.getElementById('login_modal').style.display = 'none'
            document.getElementById('login_overlay').style.display = 'none' 
            
            // call startPuzzle
            // dont call if puzzle not loaded
            if (todays_puzzles['easy']['id']) {
                loadPuzzleAndGuesses()
            }
            
        }
        
    }
}

// if user's last login was on a previous version, highlight updates
function highlightVersionButton(httpResponse) {
    const last_version_seen = httpResponse[0].version
    user.last_version = last_version_seen
    const version_button = document.getElementById('version_update_button')

    if (last_version_seen != version) {
        version_button.style.background = 'var(--wrong-color)'
    }
}

function fetchPostWrapper(url_endpoint, params, response_function) {
    const full_url = `${api_url_base}${url_endpoint}` // endpoint starts with '/'
    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      };
    
    fetch(full_url, requestOptions)
      .then(response => {
          if (!response.ok) {
            throw response;
          }
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                // .json() from queries.js can't return results.rows[0]. gets unexpected end of json
                return response.json(); 
            } 
            return null
        })
        .then(data => {
            // if no function supplied, ignore
            if (response_function) {
                response_function(data)
            }
        })
        .catch(errorResponse => {
          if (errorResponse.status >= 400 && errorResponse.status < 500) {
            // Only display the alert for 4XX client errors
            errorResponse.json().then(errorData => {
              if (errorData.err) {
                alert(errorData.err);
              } else {
                alert(`Bad bad bad. Send this to Nabil please: 
${errorData}`)
                console.error('An error occurred:', errorData);
              }
            });
          } else {
            alert(`Bad bad bad. Send this to Nabil please: 
${errorResponse}`)
            throw(errorResponse)
          }
        })
        
    
}

function loadAllGuesses() {
    // load easy and hard guesses
    const params = {
        user_id: user.id,
        puzzle_ids: {
            easy: todays_puzzles['easy']['id'],
            hard: todays_puzzles['hard']['id']
        }
    }

    fetchPostWrapper('/guesses/multiple', params ,processAllGuesses) // load guesses. send data to process
}

function processAllGuesses(all_guess_data) {
    replace_user_state(all_guess_data) // insert guess data for both easy and hard. manages possibility of no guess
        
    refreshUserInputs()

    process_guess_styling(false)
}

function loadPuzzleAndGuesses() {
    // start current puzzle, update attempt
    startPuzzle()

    // load guesses for both puzzles
    loadAllGuesses()
    
}

async function startPuzzle() {
    // starts current puzzle
    // last guess requested separately
    // updates user_state value of current puzzle_attempt

    const url = "https://scrambler-api.onrender.com/completed_puzzles/start"

    const params = {
        user_id: user.id,
        puzzle_id: puzzle.id
    }

    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      };

    // returns
    var last_guess;
    const data = await fetch(url, requestOptions)
    .then(response => {
        if (!response.ok) {
          throw response;
        }
        return response.json();
      })
      .catch(errorResponse => {
        if (errorResponse.status >= 400 && errorResponse.status < 500) {
          // Only display the alert for 4XX client errors
          errorResponse.json().then(errorData => {
            if (errorData.err) {
              alert(errorData.err);
            } else {
                alert(`Bad bad bad. Send this to Nabil please: 
${errorData}`)
              console.error('An error occurred:', errorData);
            }
          });
        } else {
            alert(`Bad bad bad. Send this to Nabil please: 
${errorResponse}`)
          console.error('A server error occurred:', errorResponse.status);
        }
      })
      .then(data => {
        // Returns current attempt
        var current_attempt = data['current_attempt']

        user_states[getDiff()].puzzle_attempt = current_attempt
    })
       
}

function replace_user_state(all_guess_data) {
    // process both easy and hard guesses
    // manage possibility of no guess

    Object.entries(all_guess_data).forEach(([diff, guess_data]) => {
        if (Object.keys(guess_data).length > 0) { // if no guess, pass
            user_states[diff]['guesses_made'] = guess_data['guess_number']
            user_states[diff]['last_guess'] = guess_data['words']
            user_states[diff]['last_input'] = guess_data['words']
        }
    })
    
}

function update_guess_count() {
    document.getElementById('guesses_made').innerText = user_states[getDiff()].guesses_made
}

function update_attempt_banner() {
    var puzzle_attempt = user_states[getDiff()].puzzle_attempt
    if (puzzle_attempt > 1) {
        
        document.getElementById('rewardless_attempt_banner').classList.add('slide_down')
        document.getElementById('gameBox_wrapper').classList.add('slide_down')
        document.getElementById('gameBox').classList.add('slide_down')
    }  else {
        document.getElementById('rewardless_attempt_banner').classList.remove('slide_down')
        document.getElementById('gameBox_wrapper').classList.remove('slide_down')
        document.getElementById('gameBox').classList.remove('slide_down')
    }
    
}

function refreshUserInputs() {
    update_attempt_banner() // show banner if current_attempt > 1
    
    update_guess_count() 

    // fill inputs with last input    
    fill_puzzle_with_guess(user_states[getDiff()].last_input)
    
    // update input styling
    reload_word_styling() // Don't send guess to API
}

function reload_word_styling() {
    // styling saved in user_states
    let word_styling = user_states[getDiff()].word_styling

    
    // classList is a space separated string
    // word_styling is an array of classes
    for (let i = 0; i < Object.keys(word_styling).length; i++) {
        let wordrow = get_nth_word(i)
        wordrow.classList = word_styling[i].join(' ')
    }
}

function fill_puzzle_with_guess(guess_words) {
    // Some elemnts of guess_word list are empty strings - no guess made for that word.
    let i = 0;

    guess_words.forEach((guess_word) => { // forEach works with Arrays
        let wordrow = get_nth_word(i)
        let inputlist = wordrow.getElementsByClassName('letterInput')
        let j = 0
        for (let j = 0; j < inputlist.length && guess_word.length > 0; j++) { // strings need to be manually iterated
            let letter_box = inputlist[j]
            let letter_order = letter_box.getAttribute('order')
            let guess_letter = guess_word[parseInt(letter_order)] // iterate through letterInput only. find corresponding user_input

            letter_box.innerText = guess_letter.toUpperCase()
            determine_local_changed_letters(letter_box) // styling for letter Above/Below
        }
        i++
    })
}

function setUser(responseData) {
    user.id = responseData[0]['id']
    user.username = responseData[0]["username"]
    user.points = responseData[0]["points"]
}


const loginForm = document.getElementById("login_form")
loginForm.addEventListener('submit', fetchLogin)

function displayLogin(responseData) {
    const username = user.username
    const points = user.points

    document.getElementById("username").innerText = `Sup, ${username}!`
    document.getElementById("points").innerText = points
    
}

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
    while (depth < puzzle.words.length) {
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

// function return true or false if word1 and word2 have only 1 letter difference
function one_letter_diff(word1, word2) {
    let w1_dict = count_letters(word1); // dictionary with (letter: count) pairs
    let w2_dict = count_letters(word2);
    let net_letters = new Map(); // dictionary with how many letters added or subtracted to get to 2nd word

    for (const [key, value] of w1_dict) { // for each letter of the first word
        if (w2_dict.has(key)) { // if letter in 2nd
            let difference = w2_dict.get(key) - value 
            net_letters.set(key, difference) // net_letters is w2 - w1 count. BONNY -> BONEY = N: -1
        } else {
            net_letters.set(key, -value) // If 2nd word doesn't have letter, count of letter in word 1 is removed.
        }
    }
    for (const [key, value] of w2_dict) { // for letters in word2
        if (!(net_letters.has(key))) { // that aren't in word1
            net_letters.set(key, value) // net increase of however many time it appears in word 2
        }
    }
    let plus_one = 0 // how many times is a letter added
    let minus_one = 0 // how many times is a letter removed
    for (const [key, value] of net_letters) {
        if (value > 0) {
            plus_one += value
        }
        if (value < 0) {
            minus_one += value
        }
    }
    // plus_one and minus_one should be symmetrical in equal length word pairs
    if (plus_one == 1 && minus_one == -1) {
        return 1
    }
    if (plus_one == 0 && minus_one == 0) {
        return 0
    }
    return plus_one
}

function determine_all_changed_letters() {
    for (let i = 0; i < puzzle.words.length; i++) {
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
        remove_changed_styling(prev, 'below')
        determine_changed_letters(el_depth-1)
    }

    remove_changed_styling(document.getElementById(wordrow_id_prefix + (el_depth).toString()))
    determine_changed_letters(el_depth)

    var next = document.getElementById(wordrow_id_prefix + (parseFloat(el_depth)+1).toString())
    if (next) {
        remove_changed_styling(next, 'above')
        determine_changed_letters(parseFloat(el_depth)+1)
    }

}

function determine_changed_letters(depth) {
    let [this_element, this_word, _] = get_depth(depth)
    let prev_word = depth - 1 < 0 ? null : get_word(depth-1)
    let next_word = parseFloat(depth) + 1 >= puzzle.words.length ? null : get_word(parseFloat(depth)+1)
    
    let this_letters_count = count_letters(this_word)
    if (next_word) {
        let next_letters_count = count_letters(next_word)
        var same_letters = new Map();
        var total_letters = 0;

        for (const [letter, n_existing] of this_letters_count) {
            if (letter != '_' && next_letters_count.has(letter)) {
                add_changed_letter_styling(this_element, letter, Math.min(n_existing, next_letters_count.get(letter)), ['sameLetter', 'below'])
            }
        }
        

        // This word has all its letters, next was has min n-1. 
        // Calc difference between counts of each letter in this to next
        // Letters with a positive score have that many of that letter highlighted as removed
        if (!next_letters_count.has('_') && !this_letters_count.has('_')) {
            for (const [letter, val] of this_letters_count) {
                let net_val = next_letters_count.has(letter) ? val - next_letters_count.get(letter) : val
                same_letters.set(letter, letter != '_' ? net_val : 0)
                total_letters += letter != '_' ? Math.max(net_val, 0) : 0
            } 
        } else if (!next_letters_count.has('_')) {
            for (const [letter, val] of this_letters_count) {
                if (!next_letters_count.has(letter) && letter != '_') {
                    same_letters.set(letter, val)
                    total_letters += parseFloat(val)
                }
            }   
            if (total_letters == 0 && this_letters_count.get('_') == 1) {
                same_letters.set('_', 1)
                total_letters += 1
            }
        }
        for (let [letter, val] of same_letters) {
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

        for (const [letter, n_existing] of this_letters_count) {
            if (letter != '_' && prev_letters_count.has(letter)) {
                add_changed_letter_styling(this_element, letter, Math.min(n_existing, prev_letters_count.get(letter)), ['sameLetter', 'above'])
            }
        }
        

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

function add_changed_letter_styling(element, letter, val, classesToAdd) {
    var word_letters = element.querySelectorAll('.letterBox')
    word_letters.forEach((word_letter) => {
        if ((word_letter.innerText == letter || (word_letter.innerText == '' && letter == '_')) && val > 0) {
            for (const classToAdd of classesToAdd) {
                word_letter.classList.add(classToAdd)
            }
            
            val--;
        }
    })
}

function remove_changed_styling(wordrow, changetype) {
    //above, below
    var word_letters = wordrow.querySelectorAll('.letterBox')
    word_letters.forEach((word_letter) => {
        if (!changetype || changetype == 'above') {
            word_letter.classList.remove('above')
        } 
        if (!changetype || changetype == 'below') {
            word_letter.classList.remove('below')
        }
        word_letter.classList.remove('sameLetter')
    })
}

function get_nth_word(depth) {
    // depth as integer needs parsing
    let guessid = wordrow_id_prefix + depth.toString()
    // returns wordRow div
    return document.getElementById(guessid)
}

function get_wordrow_letter_boxes(wordrow) {
    return wordrow.querySelectorAll('.letterBox')
}

function get_depth(d) {
  let guess_wordrow = get_nth_word(d)

  const answer_words = puzzle.answers[d]


  const guess_letters = get_wordrow_letter_boxes(guess_wordrow)
  var guess_received = ''

  guess_letters.forEach((letter_box) => {

    let letter_text = letter_box.innerText.toUpperCase()
    guess_received += letter_text ? letter_text : '_'
    
  })
  return [guess_wordrow, guess_received, answer_words] // guess_wordrow = DOM element, guess_received = word string, answer_words = list of all valid answers for this word
}

function reaches_word(thisword, thisdepth, wuc, wuc_depth) {
    let joined_words = []
    puzzle.answers[thisdepth].forEach((word) => {
        if (one_letter_diff(thisword, word) == 1) {
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
        if (one_letter_diff(guess_received, get_word(depth-1)) == 1) {
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

    // function returns bool - real_guess. If new guess same as last, don't increment guesses
    const new_guess_bool = process_guess_styling(true) // Process real guess -> send guess to API

    if (new_guess_bool) {
        user_states[getDiff()].guesses_made++;
        update_guess_count()
    }
    
  }

function create_medal(medal) {
    // creates SVG based on medal number
    const bonus_medal = document.createElement("img")
    bonus_medal.classList.add('bonus_icon')

    switch(medal) {
        case 1:
            bonus_medal.src = 'gold-medal.svg'
            break;
        case 2:
            bonus_medal.src = 'silver-medal.svg'
            break;
        default: // 3
            bonus_medal.src = 'bronze-medal.svg'
            break
    }
    console.log(bonus_medal)
    return bonus_medal
}

function showPointsPopup(data) {
    // Takes points summary from postgres, fills points popup to display to player


    // TODO modal overlay
    var base_points = data.puzzle_points - data.total_bonus

    const congrat_title = document.getElementById("reward_title") // TODO: auto change title

    const base_points_span = document.getElementById("reward_base_points")
    base_points_span.innerText = `${base_points} Points`
    
    if (data.early_bonus > 0) {
        const early_bonus = document.getElementById("early_bonus") // div

        const bonus_medal = create_medal(parseInt(data.early_bonus)) // 1 = gold, etc.. Parse to INT for switch case
        early_bonus.appendChild(bonus_medal) // insert medal into div
        document.getElementById('early_points').innerText = `+${data.early_points} Points`

    }
    if (data.fast_bonus > 0) {
        const fast_bonus = document.getElementById("fast_bonus") // div

        const bonus_medal = create_medal(data.fast_bonus) // 1 = gold, etc.
        fast_bonus.appendChild(bonus_medal) // insert medal into div
        document.getElementById('fast_points').innerText = `+${data.fast_points} Points`

    }
    if (data.guess_bonus > 0) {
        const guess_bonus = document.getElementById("guess_bonus") // div

        const bonus_medal = create_medal(data.guess_bonus) // 1 = gold, etc.
        guess_bonus.appendChild(bonus_medal) // insert medal into div
        document.getElementById('guess_points').innerText = `+${data.guess_points} Points`

    }

    const total_points = base_points + data.early_points + data.guess_points + data.fast_points
    document.getElementById("reward_total_points").innerText = `= ${total_points} Points!`
    // Display the popup
    document.getElementById('puzzle_reward').classList.add('show')

    // show leaderboard loader
    document.getElementById("reward_leaderboard_loader").style.display = 'block';
    // load Leaderboard
    const params = {
        puzzle_id: puzzle.id
    }
    fetchPostWrapper('/leaderboard/complete', params, loadInRewardLeaderboard) // hides loader
}

function loadInRewardLeaderboard(data) {

    const table_body = document.getElementById("daily_leaderboard_tbody")
    table_body.innerHTML = ''

    for (let i = 0; i < data.length; i++) {
        let row = data[i]
        let rank = i + 1 // 0 indexed
        let username = row['username']
        let points = row['total_points']
        let first_rank = row['early_bonus']
        let fast_rank = row['fast_bonus']
        let guess_rank = row['guess_bonus']
        
        let tr = document.createElement('tr')
        let th = document.createElement('th')
        th.setAttribute('scope', 'row')
        th.innerText = rank
        tr.appendChild(th)

        let nameTD = document.createElement('td')
        nameTD.innerText = username
        tr.appendChild(nameTD)

        let pointsTD = document.createElement('td')
        pointsTD.innerText = points
        tr.appendChild(pointsTD)

        let bonuses = [first_rank, fast_rank, guess_rank]

        // one by one, create medals and append to tr
        for (let j = 0; j < bonuses.length; j++) {
            let bonusTD = document.createElement('td')
            if (bonuses[j]) {
                let rank_svg = create_medal(bonuses[j])
                rank_svg.classList.add('small')
                bonusTD.appendChild(rank_svg)
            }
            tr.appendChild(bonusTD)
        }

        table_body.appendChild(tr)
    }
    document.getElementById("reward_leaderboard_loader").style.display = 'none';
}

const process_puzzle_complete = (data) => {
    if (user_states[getDiff()].puzzle_attempt > 1) { // puzzle hasn't earned any new points. nothing to display
        return
    }

    user.points = data['total_points']
    
    displayLogin() //reresh total user points
    showPointsPopup(data) //popup with points earned summary
}

function process_guess_styling(real_guess) {
    remove_all_word_style()
    var printing = ''
    var actual_answer = ''
    var curr_input_id = 0
    
    var valid_depths = []

    var one_letter_diff_shown = false
    var rule_break_notice;

    var complete_words = [] // empty strings for incomplete words
    
    for (let w = 0; w < puzzle.words.length; w++) {
      const [guess_word, guess_received, answer_words] = get_depth(w)
      let validity_status = is_word_valid(guess_word, guess_received, answer_words, valid_depths) //-2 is invalid, -1 is incomplete, 0 is unattempted, 1 is valid

      // Track answers received for pushing full guess to API
      if (validity_status == -2 || validity_status == 1) {
        complete_words.push(guess_received) // string
      } else {
        complete_words.push('')
      }

      valid_depths.push(validity_status == 1 ? true : false)

      style_guessword(guess_word, validity_status)
      
      // If !one-letter-diff-shown and w < words.length-1 and w and w+1 are complete, check one-letter-diff. If violated, one-letter-diff-shown and show rule
      if (!one_letter_diff_shown && w < puzzle.words.length -1) {
        const [next_word, next_received, next_answers] = get_depth(w+1)
        if (word_complete(guess_received, answer_words) && word_complete(next_received, next_answers)) {
            const n_letters_changed = one_letter_diff(guess_received, next_received)
            if (n_letters_changed != 1) {
                one_letter_diff_shown = true
                rule_break_notice = `Careful! You changed more than one letter between ${guess_received} and ${next_received}.`

                // If words contain same letters, change warning
                if (n_letters_changed == 0) {
                    rule_break_notice = `Whoops! You didn't change any letters between ${guess_received} and ${next_received}`
                }

            }
        }
      }
      
    }

    // If guess is same as last one, don't send to API
    // JSON.stringfy because can't compare arrays natively
    if (JSON.stringify(complete_words) == JSON.stringify(user_states[getDiff()].last_guess)) {
        real_guess = false
    }

    if (real_guess) {
        // Push guess to API
        const params = {
            puzzle_id: puzzle.id,
            user_id: user.id,
            attempt: user_states[getDiff()].puzzle_attempt,
            guess_n: user_states[getDiff()].guesses_made + 1, // When 2 guesses made, this guess is 3rd.
            words: JSON.stringify(complete_words) // prepare array to be read as json
        }
        try {
            fetchPostWrapper('/guesses', params, null)
            user_states[getDiff()].last_guess = complete_words // Update last_guess
        } catch (error) {
            alert(`Bad bad bad. Send this to Nabil please: 
${error}`)
            throw error
        } 

    }

    // If all words are valid and correct
    if (!valid_depths.some(x => x === false)) {
        document.getElementById('rowHolder').classList.add('finished') // removed on switch
        document.getElementById('answerBtn').classList.add('finished')

        // correct guess shouldn't ever be received from API, but adding check just in case
        if (real_guess) { // push complete puzzle to API
            const params = {
                puzzle_id: puzzle.id,
                user_id: user.id,
                attempt: user_states[getDiff()].puzzle_attempt,
                total_guesses: user_states[getDiff()].guesses_made + 1 // Incrementing 'guesses_made' occurs later
            }
            fetchPostWrapper('/completed_puzzles', params, process_puzzle_complete)
        }
        
    }


    if (real_guess) {
        var right_wrong = (puzzle_done(valid_depths)) ? "That's right!" : "Try again.";


        var hiding = document.getElementById("button_response")
        hiding.innerText = rule_break_notice ? rule_break_notice : right_wrong;
        hiding.style.visibility = "visible";
    }
    
    return real_guess
    
}

function style_letterBox(element) {
    
    //element.style.width = letterBoxHeight
    //element.style.height = letterBoxHeight
    // element.style.margin = letterBoxMargin
    element.style.fontSize = (document.getElementById('containall').style.width / 10).toString + 'px'
}

function resetRowInput(e) {
    const target = e.target
    const wordrow = document.getElementById(`${wordrow_id_prefix}${target.getAttribute('for')}`)
    const letter_inputs = wordrow.getElementsByClassName('letterInput')

    // remove letter hints
    for (let i = 0; i < letter_inputs.length; i++) {
        let letterBox = letter_inputs[i]
        letterBox.innerText = ''
        determine_local_changed_letters(letterBox)
    }
    // remove correct/wrong styling
    process_guess_styling(false)
    
}

function create_puzzle() {
  set_global_style_variables(puzzle['words'])

  var rowHolder = document.getElementById("rowHolder")

  var n_words = puzzle.words.length

  for (let i = 0; i < n_words; i++) {
    var row = document.createElement("div");
    row.className = "wordRow horizontal-flex-cont";
    row.id = wordrow_id_prefix + i.toString()
    

    rowHolder.appendChild(row)
    var rowWord = puzzle.words[i]

    for (let j = 0; j < rowWord.length; j++) {
      var letter = rowWord[j]
      if (letter === "_") {
        let input = document.createElement("div")
        input.classList.add("letterInput", 'letterBox', 'flex-item')
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
        letter_holder.classList.add("letterBox", 'flex-item')
        letter_holder.innerText = letter
        row.appendChild(letter_holder)
      }
      // Add reset button to end of each row
      if (j == rowWord.length - 1) {
        let reset_button = document.createElement("img")
        reset_button.classList.add('svg')
        reset_button.setAttribute('for', i) // Depth
        reset_button.setAttribute('src', 'reset.svg')
        reset_button.addEventListener("click", resetRowInput)

        let reset_div = document.createElement('div')
        reset_div.appendChild(reset_button)

        let reset_holder = document.createElement("button")

        reset_holder.appendChild(reset_div)
        reset_holder.classList.add('button', 'square', 'minimal', 'reset', 'flex-item')
        reset_holder.style.marginRight = letterBoxMargin

        row.appendChild(reset_holder)
      }
    }
  }
  determine_all_changed_letters()
}

function refreshLastGuess(e) {
    // reload last guess
    fill_puzzle_with_guess(user_states[getDiff()].last_guess)

    // restyle puzzle worrows
    process_guess_styling(false)
} 

function logVersionSeen(e) {

    // log version seen if new
    if (version != user.last_version) {
        const params = {
            user_id: user.id,
            last_version: version
        }
        fetchPostWrapper('/version/push', params, null)
    }
    
    

}



function closeFullscreenModal(modal_element) {
    modal_element.classList.remove('opened')
}



window.onload = function() {

    document.getElementById('pastPuzzlesButton').addEventListener('click', (e) => {
        alert(`You open the door to find nothing but a brick wall. 
On it, a note: 
"Come back soon and we'll have something cool here."`)
    })

    const refresh_guess_button = document.getElementById('refresh_guess')
    refresh_guess_button.addEventListener('click', refreshLastGuess)

    // send load info and IP to db
    fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => fetchPostWrapper('/visit', {ip: data.ip}, null));


    const allTooltips = document.getElementsByClassName('help-tip');
    for (let i = 0; i < allTooltips.length; i++) {
        var tooltip = allTooltips[i]
        tooltip.addEventListener("pointerenter", replaceOffscreenTooltip)
        /* tooltip.addEventListener("pointerleave", (event) => {
            const tooltip = event.target
            const tooltipText = tooltip.firstElementChild
            tooltipText.style.display = 'none'
        }) */
    }
    const change_diff_radios = document.getElementsByClassName('switch_diff_radio')
    for (let i = 0; i < change_diff_radios.length; i++) {
        var radio = change_diff_radios[i]
        radio.addEventListener("click", switchDifficulty)
    }

  const next_game = document.getElementById('next_game')

  function ShowTime() {
    var now = new Date();
    var tomorrow = new Date(now);
    tomorrow.setUTCDate(now.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    var timeLeft = tomorrow - now;

    var hrs = Math.floor((timeLeft / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    var mins = Math.floor((timeLeft / (1000 * 60)) % 60).toString().padStart(2, '0');
    var secs = Math.floor((timeLeft / 1000) % 60).toString().padStart(2, '0');
    var timeLeft = "" +hrs+':'+mins+':'+secs;
    next_game.innerHTML = timeLeft
    }
        
  setInterval(ShowTime ,1000);


  var input_id_answer = {}
  var input_id = 0
  var input_id_prefix = "user_input_"

  document.querySelectorAll('.open-fs-modal-button').forEach(element => {
    element.addEventListener('click', openFullscreenModal)
  });
  document.querySelectorAll('.close-fs-modal-button').forEach(element => {
    element.addEventListener('click', closeFullscreenModal)
  });

  var closeModalButtons = document.getElementsByClassName('close-modal-button')


  var closeRewardButton = document.getElementById('closerewardbutton')
  var puzzle_reward_modal = document.getElementById('puzzle_reward')
  closeRewardButton.onclick = close_reward_modal

  var modal = document.getElementById('howToModal')

  var keyboardbutton = document.getElementById('keyboardbutton')
  
  keyboardbutton.onclick = function() {
    
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

  function openFullscreenModal(e) {
    console.log('Trying to open')
    let target = e.target
    let modal_id = target.getAttribute('for')
    let modal = document.getElementById(modal_id)

    const modal_height = modal.getBoundingClientRect().height 
    r.style.setProperty('--fade-height', `${modal_height*0.2}px`)

    modal.classList.add('opened')
  }

  function closeFullscreenModal(e) {
    let target = e.target
    let modal_id = target.getAttribute('for')
    let modal = document.getElementById(modal_id)

    modal.classList.remove('opened')
  }

  function close_reward_modal(e) {
    var caller = e.target || e.srcElement
    var modal_to_close = document.getElementById(caller.getAttribute('for'))

    modal_to_close.classList.remove('show')

  }


  document.addEventListener("keyup", function(event) {
    if (event.key === 'Enter' && document.activeElement.id != 'email_input') {
        process_guess()
    }
  })


  document.getElementById("answerBtn").onclick = function() {
    process_guess()
  }
  
}
