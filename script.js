// 'https://scrambler-server-development.onrender.com'
// 'https://scrambler-api.onrender.com'
const api_url_base = 'https://scrambler-api.onrender.com'
const wordrow_id_prefix = 'guess_number_';
var blurred;
const start_date = new Date('2023-02-26')
const date_today = new Date()
const oneDay = 1000 * 60 * 60 * 24;

const version = 'V1.1.2'
const windowHeight = window.innerHeight; // Document.documentElement.clientHeight gives document height, which can be larger than screen height on iPhones
let not_logging_in;

history.scrollRestoration = "manual";
window.onbeforeunload = function(){
      window.scrollTop(0);
};

let user = {
    'id': null,
    'username': null,
    'points': null,
    'last_version': '',
    'streak': null,
    'max_streak': null,
    'ip': null
}

let leaderboards = {
    'easy': null,
    'hard': null,
    'week': null,
    'all': null
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
        'word_styling': {},
        'answer_button_state': [],
        'whole_puzzle_state': []
    },
    'hard': {
        'guesses_made': 0,
        'puzzle_attempt': 1,
        'last_input': [],
        'last_guess': [],
        'word_styling': {},
        'answer_button_state': [],
        'whole_puzzle_state': []
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

var message_banner; // Used for banner messages

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
var letterBoxHeight;
var letterBoxMargin;

// set temp in case puzzle slow to load
set_global_style_variables(['_____', '_____','_____','_____','_____',])


function set_global_style_variables(words) {
    // Dynamically change font size, stroke-width, margins, borders etc for letterBoxes
    // based on how many letters in puzzle's longest word

    words.forEach((word) => {
        max_wordlength = Math.max(max_wordlength, word.length)
    })
    

    // margin, stroke width, borders all scale with rowHolder font size
    // 1.8rem is appropriate for 5 words or less

    let fontsize = 1.8;

    if (max_wordlength > 5) {
        var scale_ratio = 5 / max_wordlength 
        fontsize *= scale_ratio
    }

    r.style.setProperty('--emLetterBoxMargin', '0.21em')
    r.style.setProperty('--rowHolder-font-size', `${fontsize}rem`)
    r.style.setProperty('--letterBoxMargin', `${fontsize * 0.21}rem`  ) // in rem so it can be referenced by elements outside gamebox
    r.style.setProperty('--stroke-width', '0.05em')
    // stroke width ratio of font-size
}

async function switchDifficulty(e) {
    const source_toggle = e.target
    const new_diff = source_toggle.value

    if (new_diff == 'hard' && !user.id) { // if User isn't logged in, can't change difficulty
        toast(true, 'You have to be logged in to play the hard puzzle.')

        // keep easy toggled
        document.getElementById('easy_radio').checked = true
    } else {
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
        document.getElementById('rowHolder').textContent = ''    
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
}


function saveCurrentInput() {
    var complete_words = [] // empty strings for incomplete words

    var valid_depths = [] // not used in this function
    
    // mirrors code from process_guess_styling
    // iterate through puzzle words, extracting words from inputs
    let w ;
    for (w = 0; w < puzzle.words.length; w++) {
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
    user_states[getDiff()].answer_button_state = [...document.getElementById('answerBtn').classList]
    user_states[getDiff()].whole_puzzle_state = [...document.getElementById('rowHolder').classList]

}


function replaceOffscreenTooltip(e) {
    const tooltip = e.target || e.srcElement

    const tooltipX = tooltip.getBoundingClientRect().x
    const tooltipText = tooltip.firstElementChild

    const containallWidth = containall.getBoundingClientRect().width
    
    const containallLeftX = containall.getBoundingClientRect().x
    const containallRightX = containallWidth + containallLeftX

    tooltipText.style.maxWidth = `${containallWidth * 0.7}px`

    /* tooltipText.style.display = 'block' */

    const screenPadding = 24

    tooltipText.style.left = 'auto'
    tooltipText.style.right = 'auto'

    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipTextRect = tooltipText.getBoundingClientRect();

    const tooltipTextRightX = tooltipTextRect.x + tooltipTextRect.width
    const tooltipRightX = tooltipRect.x + tooltipRect.width


    if (tooltipTextRect.x < containallLeftX) { // Tooltips leftmost point is off screen to the left
        const space_between = tooltipX - containallLeftX
        tooltipText.style.left = `calc(-${space_between}px + 1em)`
    } else if (tooltipTextRightX > containallRightX) {
        const space_between = containallRightX - tooltipX
        tooltipText.style.right = `calc(-${space_between}px + 2em)` // 2 em because helptip width is 1em
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

    const url = `${api_url_base}/puzzles`
    const http = new XMLHttpRequest()
    http.open("GET", url)
    http.responseType = 'json'
    http.send() // Make sure to stringify
    http.onload = function() {
        declare_puzzle(http.response) // easy and hard
        // Puzzle slow to load, user already logged in. Once puzzle done loading, send start info.
        // Or, user refused login. closing modal set not_logging_in to true.
        // If user later decides to log in, clicking login button will set not_loggin_in to false
        if (user.id || (!user.id && not_logging_in == true) ) { 
             
            loadPuzzleAndGuesses()
        }
    }
}

async function refreshLeaderboard() {
    const leaderboard_params = {
        easy_id: todays_puzzles.easy.id,
        hard_id: todays_puzzles.hard.id,
        week_start: getMostRecentWeekday(6) //6 for saturday
    }

    await fetchPostWrapper('/leaderboard/all', leaderboard_params, loadFullLeaderboard)
}

function loadFullLeaderboard(httpResponse) {
    // Loaded 
    const easy_leaderboard = httpResponse.easy
    const hard_leaderboard = httpResponse.hard
    const week_leaderboard = httpResponse.week
    const all_leaderboard = httpResponse.all

    leaderboards.easy = easy_leaderboard
    leaderboards.hard = hard_leaderboard
    leaderboards.week = week_leaderboard
    leaderboards.all = all_leaderboard

    loadDailyLeaderboard(easy_leaderboard, 'easy')
    loadDailyLeaderboard(hard_leaderboard, 'hard')
    loadLongerLeaderboard(week_leaderboard, 'week')
    loadLongerLeaderboard(all_leaderboard, 'all')
    
    loadProfileStats()
    
}

function loadProfileStats() {
    const weekly = leaderboards.week
    const global = leaderboards.all

    for (let i = 0; i < global.length; i++) {
        if (global[i]['username'] == user.username) {
            const rank = i + 1
            document.getElementById('globalRank').innerText = rank
            document.getElementById('scrambles').innerText = global[i]['n_puzzles']
        }
    }

    for (let i = 0; i < weekly.length; i++) {
        if (weekly[i]['username'] == user.username) {
            const rank = i + 1
            
            document.getElementById('weekly-rank').innerText = rank;
        }
    }
    
    
}

function loadDailyLeaderboard(lb, diff) {
    const tbody_id = `${diff}_leaderboard_tbody`
    const lb_tbody = document.getElementById(tbody_id)

    lb_tbody.textContent = ''

    for (let i = 0; i < lb.length && i < 25; i++) {
        let lb_entry = lb[i]
        let rank = i + 1
        let username = lb_entry['username']
        let points = lb_entry['total_points']
        let early_bonus = create_medal(lb_entry['early_bonus'], 'small')
        let fast_bonus = create_medal(lb_entry['fast_bonus'], 'small')
        let guess_bonus = create_medal(lb_entry['guess_bonus'], 'small')

        let row = createTableRow([rank, username, points, early_bonus, fast_bonus, guess_bonus])
        lb_tbody.appendChild(row)
    }
    if (lb.length == 0) {
        let row = createTableRow(['', 'Waiting for someone to complete a puzzle.', '', '', '', ''])
        lb_tbody.appendChild(row)
    }
}

function loadLongerLeaderboard(lb, timespan) {
    const tbody_id = `${timespan}_leaderboard_tbody`
    const lb_tbody = document.getElementById(tbody_id)

    lb_tbody.textContent = ''

    for (let i = 0; i < lb.length && i < 25; i++) {
        let lb_entry = lb[i]
        let rank = i + 1
        let username = lb_entry['username']
        let points = lb_entry['sum']
        let gold = lb_entry['gold']
        let silver = lb_entry['silver']
        let n_puzzles = lb_entry['n_puzzles']

        let row = createTableRow([rank, username, points, gold, silver, n_puzzles])
        lb_tbody.appendChild(row)
    }
    if (lb.length == 0) {
        let row = createTableRow(['', 'Waiting for someone to complete a puzzle.', '', '', '', ''])
        lb_tbody.appendChild(row)
    }
}


function finishLogin(httpResponse) {
    // login_data contains cookie
    // parse cookie data to feed client-facing user data


    setUser(httpResponse)
    const newparams = {
        user_id: user.id,
        user_ip: user.ip
    }
    fetchPostWrapper('/version/get', newparams, highlightVersionButton)

    if (puzzle.id) {
        newparams['puzzle_id'] = todays_puzzles.easy.id // user can only play easy puzzle while not logged in.
        fetchPostWrapper('/backfill', newparams, loadPuzzleAndGuesses) // if any guesses or completed_puzzles have been made by the ip, user id will be appended
    }
    

    displayLogin()
    // Login successful
    document.getElementById('login_modal').classList.remove('opened')
    document.getElementById('overlay').classList.add('closed')



    // TODO: visit request is first to be sent to server. Should return cookie if exists. 
    // Send callback here to parse cookie
}


function manageLoginError(errorResponse, errorParams) {
    if (errorResponse.status >= 400) {
        // Timeout to allow loader to hide before raising alert.
        document.getElementById('login_loader').style.visibility = 'hidden'
        document.getElementById('reset_loader_1').style.visibility = 'hidden'
        document.getElementById('reset_loader_2').style.visibility = 'hidden'
        document.getElementById('reset_loader_3').style.visibility = 'hidden'

        const contentType = errorResponse.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            errorResponse.json().then(errorData => {
                if (errorData.err) {
                    toast(true, errorData.err);
                } else {
                    toast(true)
                    fetchPostWrapper('/logerror', errorParams, null, function() {return})
                }
            })
        } else {
            toast(true)
            fetchPostWrapper('/logerror', errorParams, null, function() {return})
        }

    }
}

function openForgotUsernameModal() {
    // Open modal where user sends username to their email
    document.getElementById('send_forgot_username_modal').classList.add('opened')
    document.getElementById('login_loader').style.visibility = 'hidden'
    document.getElementById('reset_loader_3').style.visibility = 'hidden'

    document.getElementById('overlay').classList.add('higher') // add overlay to login modal
}

function openResetTokenModal() {
    // Open modal where user send reset token to their email
    document.getElementById('send_reset_email_modal').classList.add('opened')
    document.getElementById('reset_loader_1').style.visibility = 'hidden'
    document.getElementById('login_loader').style.visibility = 'hidden'

    document.getElementById('overlay').classList.add('higher') // add overlay to login modal
}

function openPasswordResetModal() {
    // close previous modal.
    // Open new modal to input reset token and new password
    document.getElementById('password_reset_modal').classList.add('opened')
    document.getElementById('send_reset_email_modal').classList.remove('opened')
    document.getElementById('reset_loader_1').style.visibility = 'hidden'
    document.getElementById('reset_loader_2').style.visibility = 'hidden'
    document.getElementById('login_loader').style.visibility = 'hidden'

    const email = document.getElementById('reset_email_send').value.toLowerCase()

    if (email) {
        document.getElementById('reset_email').value = email
    }
}

async function requestUsername(e) {
    document.getElementById('reset_loader_3').style.visibility = 'visible'

    e.preventDefault()

    const submit_type = e.submitter.name

     // requesting reset token be sent to email
    const email = document.getElementById('username_email_send').value.toLowerCase()
    // TODO: Regex check that email is valid

    if (!email) {
        toast(true, 'Please enter the email address you used to create your profile.')
        document.getElementById('reset_loader_3').style.visibility = 'hidden'

    } else { // email present

        const params = {
            email: email,
        }
        await fetchPostWrapper('/username/recover', params, null, manageResetError)
        closeFullscreenModal('send_forgot_username_modal')
        
        toast(false,'If a profile exists, an email has been sent containing your username.')
        
        
    }
    
}


function requestResetToken(e) {
    document.getElementById('reset_loader_1').style.visibility = 'visible'

    e.preventDefault()

    const submit_type = e.submitter.name

    if (submit_type == 'input_token') {
        openPasswordResetModal()
    } else { // requesting reset token be sent to email
        const email = document.getElementById('reset_email_send').value.toLowerCase()
        // TODO: Regex check that email is valid

        if (!email) {
            toast(true, 'Please enter the email address you used to create your profile.')
            document.getElementById('reset_loader_1').style.visibility = 'hidden'

        } else { // email present

            const params = {
                email: email,
            }
            fetchPostWrapper('/password/reset', params, openPasswordResetModal, manageResetError)
        }
    }
}

function submitNewPassword(e) {
    document.getElementById('reset_loader_2').style.visibility = 'visible'

    e.preventDefault()

    const email = document.getElementById('reset_email').value.toLowerCase()
    const new_pword = document.getElementById('new_pword').value
    const reset_token = document.getElementById('reset_token').value

    // No checking submitter because only submit button is to send new password

    if (!email || !new_pword || !reset_token) {
        toast(true, 'Please fill all fields.')
        document.getElementById('reset_loader_2').style.visibility = 'hidden'
    } else {
        const params = {
            email: email,
            new_pword: new_pword,
            reset_token: reset_token
        }
        fetchPostWrapper('/password/new', params, resetSuccess, manageResetError)
    }
    
    
}

function resetSuccess(httpResponse) {
    
    document.getElementById('overlay').classList.remove('higher')
    document.getElementById('password_reset_modal').classList.remove('opened')

    toast(false, `Your password reset was successful. You can now login with your new password.`)
}

function manageResetError(errorResponse) {
    // User gets generic error

    if (errorResponse.status >= 400) {
        // Timeout to allow loader to hide before raising alert.
        document.getElementById('login_loader').style.visibility = 'hidden'

        toast(true, `Your password reset failed. Check that the values were correct and your reset token hasn't expired or been used.`)
          
        }
    }


async function fetchLogin(event) {
    event.preventDefault()

    const submit_type = event.submitter.name

    var params = {
        uname: document.getElementById('uname').value,
        pword: document.getElementById('pword').value,
        email: document.getElementById('email').value.toLowerCase(),
        user_ip: user.ip
    }

    document.getElementById('login_loader').style.visibility = 'visible'

    // TOOD: validate email and that all fields exist.

    if (submit_type == 'create') {
        if (!params.uname || !params.pword || !params.email) {
            toast(true, 'Please include all fields.')
        } else {
            not_logging_in = false
            await fetchPostWrapper('/users', params, finishLogin, manageLoginError)
            openFullscreenModal('howToModal')
        }
        
    } else if (submit_type == 'reset') {
        openResetTokenModal()
    } else if (submit_type == 'forgot_username') {
        openForgotUsernameModal()
    } else { // login
        not_logging_in = false
        await fetchPostWrapper('/users/login', params, finishLogin, manageLoginError)
    }
    
}

// if user's last login was on a previous version, highlight updates
function highlightVersionButton(httpResponse) {
    if (httpResponse.length >= 1) {
        const last_version_seen = httpResponse[0]['version']
        logVersionSeen()

        user.last_version = last_version_seen
        const version_button = document.getElementById('version_update_button')

        if (last_version_seen == version) {
            version_button.style.backgroundColor = 'lightgray'
        }
    }
    
}

async function toast(error_bool, message=null) {
    // create generic error toast

    const toast = document.createElement('div')
    toast.classList.add('popup-modal', 'fromtop', 'toast')
    if (error_bool) {
        toast.classList.add('error') //sets red background
    }
    document.getElementById('modal_container').appendChild(toast)

    const toast_message = document.createElement('div')
    toast_message.innerText = message ? message : `Something went wrong. Don't worry - we're gonna look into it.`
    
    toast.appendChild(toast_message)

    setTimeout(function() {
        toast.classList.add('opened') // required so modal begins above screen
    }, 100)

    
    

    setTimeout(function() {
        toast.classList.remove('opened')
        setTimeout(function() { // wait for toast to disappear before removing
            document.getElementById('modal_container').removeChild(toast) 
        }, 2000)
        
    }, 4000)

    
    
    
}

async function fetchPostWrapper(url_endpoint, params, response_function, error_function=null) {
    const full_url = `${api_url_base}${url_endpoint}` // endpoint starts with '/'
    const requestOptions = {
        method: 'POST',
        // credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      };
    
    await fetch(full_url, requestOptions)
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
            return
        })
        .catch(errorResponse => {
            if (errorResponse.name) { // javascript error
                errorResponse = {
                    name: errorResponse.name,
                    message: errorResponse.message,
                    stack: errorResponse.stack ? errorResponse.stack : 'none'
                }
            }
            const errorparams = {
                payload: params,
                route: url_endpoint,
                errorResponse: errorResponse,
            }

            if (error_function) {
                error_function(errorResponse, errorparams)
                return
            } else {
            // fetch send self error in email (with empty callback to avoid endless loop)

            if (errorResponse.status >= 400 && errorResponse.status < 500) {
                const contentType = errorResponse.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    errorResponse.json().then(errorData => {
                        if (errorData.err) {
                            toast(true, errorData.err);
                            return
                        } else {
                            errorparams['errorData'] = errorData
                            fetchPostWrapper('/logerror', errorparams, null, function() {return})
                            
                        }
                    });
                } else {
                    fetchPostWrapper('/logerror', errorparams, null, function() {return})
                }
                
                // Only display the alert for 4XX client errors
                
            } else { // 500 errors are all for internal server errors. 502 for bad request
                fetchPostWrapper('/logerror', errorparams, null, function() {return})
            }
        }

        // generic error toast
        toast(true) // false for error

        })
    return
}

function loadAllGuesses() {
    // load easy and hard guesses

    const params = {
        user_id: user.id,
        user_ip: user.ip,
        puzzle_ids: {
            easy: todays_puzzles['easy']['id'],
            hard: todays_puzzles['hard']['id']
        }
    }

    fetchPostWrapper('/guesses/multiple', params, processAllGuesses) // load guesses. send data to process
    

}

function processAllGuesses(all_guess_data) {
    replace_user_state(all_guess_data) // insert guess data for both easy and hard. manages possibility of no guess
    
    refreshUserInputs()

    process_guess_styling(false)
    
}

async function loadPuzzleAndGuesses() {
    // start current puzzle, update attempt
    await startPuzzle()

    // load guesses for both puzzles
    loadAllGuesses()

    // Get Leaderboard since puzzle_ids are in.
    await refreshLeaderboard()
    
}

async function startPuzzle() {
    // starts current puzzle
    // last guess requested separately
    // updates user_state value of current puzzle_attempt

    const params = {
        user_id: user.id,
        puzzle_id: puzzle.id,
        user_ip: user.ip
    }

    fetchPostWrapper('/completed_puzzles/start', params, function(data) {
        user_states[getDiff()].puzzle_attempt = data['current_attempt']
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

function goodBannerMessage(message) {
    message_banner.innerText = message
    message_banner.style.backgroundColor = 'var(--correct-color)'
    message_banner.classList.add('slide_down')
    document.getElementById('gameBox_wrapper').classList.add('slide_down')
    document.getElementById('gameBox').classList.add('slide_down')
    readjustContainallPadding()
}

function badBannerMessage(message) {
    message_banner.innerText = message
    message_banner.style.backgroundColor = 'var(--wrong-color)'
    message_banner.classList.add('slide_down')
    document.getElementById('gameBox_wrapper').classList.add('slide_down')
    document.getElementById('gameBox').classList.add('slide_down')
    readjustContainallPadding()
}

function closeBannerMessage() {
    message_banner.classList.remove('slide_down')
    document.getElementById('gameBox_wrapper').classList.remove('slide_down')
    document.getElementById('gameBox').classList.remove('slide_down')
    readjustContainallPadding()
}

function update_attempt_banner() {
    var puzzle_attempt = user_states[getDiff()].puzzle_attempt
    // let rowholder_classes = !document.getElementById('rowHolder').classList // when checking classlist values, use contains
    
    if (puzzle_attempt > 1 && !document.getElementById('rowHolder').classList.contains('finished')) { // When finishing a puzzle not logged in, then logging in, resends attempt
        goodBannerMessage(`Since you've already completed this puzzle before, any future attempts won't earn you any rewards.`)
    }  else {
        closeBannerMessage()
    }
    
}

function refreshUserInputs() {
    update_attempt_banner() // show banner if current_attempt > 1
    
    update_guess_count() 

    // fill inputs with last input if one exists
    if (user_states[getDiff()].last_input.length > 0) {
        fill_puzzle_with_guess(user_states[getDiff()].last_input)
    }
    
    
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

    if (user_states[getDiff()].answer_button_state.length > 0) {
        document.getElementById('answerBtn').classList = user_states[getDiff()].answer_button_state.join(' ')
        
    }
    if (user_states[getDiff()].whole_puzzle_state.length > 0) {
        document.getElementById('rowHolder').classList = user_states[getDiff()].whole_puzzle_state.join(' ')
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
    user.id = responseData['id']
    user.username = responseData["username"]
    user.points = responseData["points"]
    user.streak = responseData['streak']
    user.max_streak = responseData['max_streak']
}



const loginForm = document.getElementById("login_form")
loginForm.addEventListener('submit', fetchLogin)

function displayLogin() {
    const username = user.username
    const points = user.points
    const streak = user.streak || 0
    const max_streak = user.max_streak || 0


    document.getElementById("username").innerText = `Sup, ${username}!`
    document.getElementById("points").innerText = points
    document.getElementById('open_login_button').style.display = 'none'

    var points_displays = document.getElementsByClassName('points')
    for (let i = 0; i < points_displays.length; i++) {
        points_displays[i].innerText = points
    }

    var streaks = document.getElementsByClassName('streak')
    for (let i = 0; i < streaks.length; i++) {
        streaks[i].innerText = streak
    }

    var max_streaks = document.getElementsByClassName('max-streak')
    for (let i = 0; i < max_streaks.length; i++) {
        max_streaks[i].innerText = max_streak
    }
    
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

    //For tutorial
    if (!isNumeric(depth) && order < parseInt(4)) { //order only in 3rd tutorial puzzle
        
        next_letter = document.getElementById(`tut-3-${parseInt(order) + 1}`)
    } else {
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
            case 'enter':
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

    
    // remove styling from any words after this one
    remove_lower_word_styling(word)
    
}

function remove_lower_word_styling(wordRow) {
    // remove word style
    remove_word_style(wordRow)
    
    let depth = wordRow.id.slice(wordrow_id_prefix.length)
    // remove word style from later words
    if (!isNumeric(depth)) { //for tutorial
        let tut_puzz = depth.slice(0,1)
        let depth_n = depth.slice(1) // now will be int
        let puzz_len;
        if (tut_puzz == 'a') {
            puzz_len = 2
        } else {
            puzz_len = 3
        }

        while (depth_n < puzz_len) {
            const [next_word, ng, na] = get_depth(depth)
            remove_word_style(next_word)
            depth_n++
        }

    } else { // normal puzzle
        depth++
        while (depth < puzzle.words.length) {
            const [next_word, ng, na] = get_depth(depth) 
            remove_word_style(next_word)
            depth++
        }
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

function isNumeric(value) {
    return /^-?\d+$/.test(value);
}

function determine_local_changed_letters(element) {
    var el_depth = element.getAttribute('depth')
    
    if (['a', 'b'].includes(el_depth.slice(0, 1))) {
        return;
    }

    // tutorial elements don't have depth
    if (el_depth) {
        // function already ignored depths out of range of prev and next words
    // remove removed from above
    // remove all from this
    // remove added from below
    let prev;
    let prev_d;
    if (isNumeric(el_depth)) {
        prev = document.getElementById(wordrow_id_prefix + (el_depth-1).toString())
        prev_d = el_depth - 1
    } else { //tutorial
        let d_value = el_depth.slice(-1)
        
        prev_d = el_depth.slice(0, -1) + (parseInt(d_value) - 1).toString()
        
        prev = document.getElementById(wordrow_id_prefix + prev_d)
    }
    
    if (prev) {
        remove_changed_styling(prev, 'below')
        determine_changed_letters(prev_d)
    }

    remove_changed_styling(document.getElementById(wordrow_id_prefix + (el_depth).toString()))
    determine_changed_letters(el_depth)

    let next;
    let next_d;
    if (isNumeric(el_depth)) {
        next = document.getElementById(wordrow_id_prefix + (parseInt(el_depth)+1).toString())
        next_d = parseInt(el_depth) + 1
    } else { //tutorial
        let d_value = el_depth.slice(-1)
        next_d = el_depth.slice(0, -1) + (parseInt(d_value) + 1).toString()
        next = document.getElementById(wordrow_id_prefix + next_d)
    }
    
    if (next) {
        remove_changed_styling(next, 'above')
        determine_changed_letters(next_d)
    }
    } 
    

}

function determine_changed_letters(depth) {
    // If tutorial, depth will be c0, c1, c2
    let this_element, this_word, prev_word, next_word, _;

    [this_element, this_word, _] = get_depth(depth)

    if (!isNumeric(depth)) {
        let prev_d = 'c' + (parseInt(depth.slice(-1)) - 1).toString()
        let next_d = 'c' + (parseInt(depth.slice(-1)) + 1).toString()
        prev_word = prev_d == 'c-1' ? null : get_word(prev_d)
        next_word = next_d == 'c3' ? null : get_word(next_d)
    } else {
        prev_word = depth - 1 < 0 ? null : get_word(depth-1)
        next_word = parseFloat(depth) + 1 >= puzzle.words.length ? null : get_word(parseFloat(depth)+1)
    }
    
    
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
    let guess_wordrow
    let answer_words
    if (!isNumeric(d)) {    
        guess_wordrow = document.getElementById(`${wordrow_id_prefix}${d}`)
        answer_words = null
        
    } else {
        guess_wordrow = get_nth_word(d)
        answer_words = puzzle.answers[d]
    }

  const guess_letters = get_wordrow_letter_boxes(guess_wordrow)
  var guess_received = ''

  guess_letters.forEach((letter_box) => {

    let letter_text = letter_box.innerText.toUpperCase()
    guess_received += letter_text ? letter_text : '_'
    
  })
  return [guess_wordrow, guess_received, answer_words] // guess_wordrow = DOM element, guess_received = word string, answer_words = list of all valid answers for this word
}

function reaches_word(thisword, thisdepth, wuc, wuc_depth) {
    // wuc = word under consideration

    // So, there is at least one word intervening between wuc and thisword, which may or may not be entered (the first time this function is called [it's recursive])
    // wuc is correct, but there is more than one possible answer
    // The objective is to determine if the last correct word entered is on a branch that can lead to this word

    // for all the possible answers at the next depth, how many join with thisword?
    let nextdepth = thisdepth + 1
    let joined_words = []
    puzzle.answers[nextdepth].forEach((word) => { // no concern of over-indexing, since this function can't be called on the last word.
        if (one_letter_diff(thisword, word) == 1) {
            joined_words.push(word)
        }
    })

    if (nextdepth == wuc_depth) { // if we've dug down the branch until we reached wuc_depth, does the branch join wuc?
        return joined_words.includes(wuc)
    } else { // there's still at least one depth before we reach wuc_depth

        // If even one reaches_word returns true, then the branch, then the nearest valid word reaches wuc.

        let reaches = false
        joined_words.forEach((word) => {
            if (reaches_word(word, thisdepth+1, wuc, wuc_depth)) { // branch downwards recursively, until we get an answer that some word reaches wuc
                reaches = true
                return reaches // no need to ask the rest of the branches
            }
        })
        return reaches // only returns false if none of the words on any branches reach wuc.
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
    let i = depth - 1
    while (nearest_valid_depth == -1 && i >= 0) {
        nearest_valid_depth = valid_depths[i] ? i : nearest_valid_depth;
        i--;
    }
    
    // is there a nearest valid word?
    if (nearest_valid_depth != -1) {
        let valid_word = get_word(nearest_valid_depth)
        // see whether the branch that valid word belongs to joins up to the guess word being considered
        if (reaches_word(valid_word, nearest_valid_depth, guess_received, depth)) {
            return 1
        }
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
    const wordrows = document.querySelectorAll('.wordRow:not(.ex)')
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

function create_medal(medal, extra_classes = null) {
    /*if (!medal) {
        return null
    }*/
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
        case 3:
            bonus_medal.src = 'bronze-medal.svg'
            break;
        default: // No medal
            break;
    }
    if (extra_classes) {
        extra_classes.split(' ').forEach((class_name) => {
            bonus_medal.classList.add(class_name)
        })
    }
    
    return bonus_medal.src ? bonus_medal : null 
}

function showPointsPopup(data) {
    // Takes points summary from postgres, fills points popup to display to player

    // what to do if not logged in

    var base_points = data.puzzle_points - data.total_bonus

    const congrat_title = document.getElementById("reward_title") // TODO: auto change title

    const base_points_span = document.getElementById("reward_base_points")
    base_points_span.innerText = `${base_points} Points`

    const early_bonus = document.getElementById("early_bonus") // div
    early_bonus.textContent = ''

    const fast_bonus = document.getElementById("fast_bonus") // div
    fast_bonus.textContent = ''

    const guess_bonus = document.getElementById("guess_bonus") // div
    guess_bonus.textContent = ''
    
    if (data.early_bonus > 0) {
        

        const bonus_medal = create_medal(parseInt(data.early_bonus)) // 1 = gold, etc.. Parse to INT for switch case
        early_bonus.appendChild(bonus_medal) // insert medal into div
        document.getElementById('early_points').innerText = `+${data.early_points} Points`

    }
    if (data.fast_bonus > 0) {
        

        const bonus_medal = create_medal(data.fast_bonus) // 1 = gold, etc.
        fast_bonus.appendChild(bonus_medal) // insert medal into div
        document.getElementById('fast_points').innerText = `+${data.fast_points} Points`

    }
    if (data.guess_bonus > 0) {
        

        const bonus_medal = create_medal(data.guess_bonus) // 1 = gold, etc.
        guess_bonus.appendChild(bonus_medal) // insert medal into div
        document.getElementById('guess_points').innerText = `+${data.guess_points} Points`

    }

    const total_points = base_points + data.early_points + data.guess_points + data.fast_points

    let total_reward_message;
    if (!user.id) {
        total_reward_message = `If you create an account, you can track your points and rank on the leaderboard.`
    } else {
        total_reward_message = `= ${total_points} Points!`
    }

    document.getElementById("reward_total_points").innerText = total_reward_message
    
    // Display the popup
    document.getElementById('puzzle_reward').classList.add('opened')
    document.getElementById('overlay').classList.remove('closed')

    // show leaderboard loader
    document.getElementById("reward_leaderboard_loader").style.display = 'block';
    // load Leaderboard
    const params = {
        puzzle_id: puzzle.id
    }
    fetchPostWrapper('/leaderboard/complete', params, loadInRewardLeaderboard) // hides loader
}

function createTableRow(input_list) {
    // create tr (new row)
    let tr = document.createElement('tr')
    
    for (let i = 0; i < input_list.length; i++) {
        // create cell. th if first element of input row. else td
        let cell;
        if (i == 0) {
            cell = document.createElement('th')
            cell.setAttribute('scope', 'row')
        } else {
            cell = document.createElement('td')
        }
        
        let cell_value = input_list[i]
        if (cell_value === null || typeof cell_value === 'undefined') {
            cell.innerText = ''
            // empty cell
        }
        else if (cell_value instanceof Element) { // is DOM element
            cell.appendChild(cell_value)
        } else { // assume text or number
            cell.innerText = cell_value
        }

        tr.appendChild(cell)
    }
    return tr
}

function loadInRewardLeaderboard(data) {

    const table_body = document.getElementById("daily_leaderboard_tbody")
    table_body.textContent = ''

    for (let i = 0; i < data.length; i++) {
        let row = data[i]
        let rank = i + 1 // 0 indexed
        let username = row['username']
        let points = row['total_points']
        let first_rank = row['early_bonus']
        let fast_rank = row['fast_bonus']
        let guess_rank = row['guess_bonus']

        let early_bonus = create_medal(row['early_bonus'], 'small')
        let fast_bonus = create_medal(row['fast_bonus'], 'small')
        let guess_bonus = create_medal(row['guess_bonus'], 'small')
        /*
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
        */

        let bonuses = [first_rank, fast_rank, guess_rank]

        let bonus_elements = []

        // one by one, create medals and append to tr
        for (let j = 0; j < bonuses.length; j++) {
            if (bonuses[j]) {
                let rank_svg = create_medal(bonuses[j])
                rank_svg.classList.add('small')
                bonus_elements.push(rank_svg)
            }
        }

        let tr = createTableRow([rank, username, points, early_bonus, fast_bonus, guess_bonus])

        table_body.appendChild(tr)
    }
    document.getElementById("reward_leaderboard_loader").style.display = 'none';
}

const process_puzzle_complete = (data) => {
    refreshLeaderboard() // Just for giggles, do it even if puzzle wasn't first attempt

    if (user.id) { // only update if logged in
        
        if (user_states[getDiff()].puzzle_attempt > 1) { // puzzle hasn't earned any new points. nothing to display
            return
        }

        user.points = data['total_points']
        user.streak = data['streak']
        user.max_streak = data['max_streak']

        
        
        displayLogin() //reresh total user points
    }

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
        // Always send with IP. if not logged in, server manages
        const params = {
            puzzle_id: puzzle.id,
            user_id: user.id,
            attempt: user_states[getDiff()].puzzle_attempt,
            guess_n: user_states[getDiff()].guesses_made + 1, // When 2 guesses made, this guess is 3rd.
            words: JSON.stringify(complete_words), // prepare array to be read as json
            user_ip: user.ip
        }
        

        fetchPostWrapper('/guesses', params, null)
        user_states[getDiff()].last_guess = complete_words // Update last_guess

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
                total_guesses: user_states[getDiff()].guesses_made + 1, // Incrementing 'guesses_made' occurs later
                user_ip: user.ip
            }
            fetchPostWrapper('/completed_puzzles', params, process_puzzle_complete)
        }
        
    }


    if (real_guess) {

        if (puzzle_done(valid_depths)) { // Finished puzzle
            closeBannerMessage()
            // setTimeout(function(){goodBannerMessage(`Nailed it!`)},1000) // Time for close banner to finish closing
            
        } else if (rule_break_notice) { // Breaking core rules
            badBannerMessage(rule_break_notice)
        } else {
            closeBannerMessage()
        }
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
    remove_lower_word_styling(wordrow)

    
    
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

    // Add invis button to start of each row
    let invis_reset_button = createResetButton(i)
    invis_reset_button.classList.add('invisible')
    row.appendChild(invis_reset_button)


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
      
    }
    // Add reset button to end of each row
    let reset_button = createResetButton(i)
    row.appendChild(reset_button)
  }
  determine_all_changed_letters()

    function createResetButton(i) {
        let reset_button = document.createElement("img");
        reset_button.classList.add('svg');
        reset_button.setAttribute('for', i); // Depth
        reset_button.setAttribute('src', 'reset.svg');
        reset_button.addEventListener("click", resetRowInput);

        let reset_div = document.createElement('div');
        reset_div.appendChild(reset_button);

        let reset_holder = document.createElement("button");

        reset_holder.appendChild(reset_div);
        reset_holder.classList.add('button', 'square', 'minimal', 'reset', 'flex-item');
        return reset_holder;
    }
    process_guess_styling(false)
    readjustContainallPadding()
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

function getMostRecentWeekday(targetDOW) { //Sunday = 0, Saturday = 6
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    
    const daysSinceWeekday = (dayOfWeek < targetDOW) ? (1 + dayOfWeek + 6 - targetDOW) : dayOfWeek - targetDOW;

    const mostRecentTargetDOW = new Date(today.getTime() - (daysSinceWeekday * 24 * 60 * 60 * 1000));
    
    const year = mostRecentTargetDOW.getFullYear();
    const month = String(mostRecentTargetDOW.getMonth() + 1).padStart(2, '0');
    const day = String(mostRecentTargetDOW.getDate()).padStart(2, '0');

    
    return `${year}-${month}-${day}`;
  }


function changeLeaderboard(e) {
    var target = e.target
    var change_to = target.value // today week all

    // hide all leaderboards
    hideAllLeaderboards()

    if (change_to == 'today') { // today tab
        
        // Show difficulty toggle
        document.getElementById('today_leaderboard_diff').classList.remove('invisible')

        // change icons to bonuses
        document.getElementById('today_thead').classList.remove('removed')

        showCheckedLeaderboard()

    } else { // week or all tab
        

        var target_tbody = document.getElementById(`${change_to}_leaderboard_tbody`)
        target_tbody.classList.remove('invisible')
        document.getElementById('long_thead').classList.remove('removed')
        document.getElementById('today_leaderboard_diff').classList.add('invisible')

        // TODO load user stats for change_to
    }

    loadUserStats()

}

function loadUserStats() {
    // For leaderboard

    let active_leaderboard;
    let top_toggle_value = document.querySelector('input[name=switch-two]:checked').value
    if (top_toggle_value == 'today') {
        active_leaderboard = document.querySelector('input[name=switch-3]:checked').value
    } else {
        active_leaderboard = top_toggle_value
    }

    var rank = '?';
    var points = '?';
    var reset = ''
    var full_leaderboard = leaderboards[active_leaderboard]
    for (let i = 0; i < full_leaderboard.length; i++) {
        if (full_leaderboard[i]['username'] == user.username) {
            rank = i + 1
            points = full_leaderboard[i]['total_points'] || full_leaderboard[i]['sum'] // changes naming based on daily or long span leaderboard
            break;
        }
    }

    switch(active_leaderboard) {
        case 'all':
            reset = 'NEVER!'
            break;
        case 'week':
            reset = 'Friday, 8PM EST'
            break;
        default: // today
            reset = '8PM EST'
            break;
    }

    if (rank) {
        document.getElementById('lb_rank').innerText = rank
        document.getElementById('lb_points').innerText = points
    }
    
    document.getElementById('next_reset').innerText = reset

    
        
            



}

function hideAllLeaderboards() {
    var tbodys = document.getElementsByClassName('full-leaderboard-tbody')
    for (let i = 0; i < tbodys.length; i++) {
        tbodys[i].classList.add('invisible')
    }
    document.getElementById('today_thead').classList.add('removed') 
    document.getElementById('long_thead').classList.add('removed')
}


function showCheckedLeaderboard() {
    loadUserStats()
    var checked_radio = document.querySelector('input[name=switch-3]:checked')
    var value = checked_radio.value

    hideAllLeaderboards()
    document.getElementById(`${value}_leaderboard_tbody`).classList.remove('invisible')
    document.getElementById('today_thead').classList.remove('removed')

    // TODO load user stats
}

var keyboard = document.getElementById('keyboard-cont')


  function readjustContainallPadding() {
    // timeout to allow for transitions to complete
    setTimeout(function() {
        // Adds padding to the bottom of containall so that it visually takes up the whole screen, and allows for keyboard
        const containall = document.getElementById('containall')
        const containallBottomPadding = window.getComputedStyle(containall)['paddingBottom'].slice(0, -2)
        const containall_total_height = containall.getBoundingClientRect().height 
        const containall_height = containall_total_height - containallBottomPadding
        const keyboard_height = keyboard.getBoundingClientRect().height
        const windowHeight = window.innerHeight


        let containallNewPaddingHeight;

        if (containall_height + keyboard_height > windowHeight) { // containall + keyboard exceed the screen
            // padding is equal to MAX( (containall + keyboard) - window, keyboard)
            containallNewPaddingHeight = Math.max(containall_height + keyboard_height - windowHeight, keyboard_height)

        } else { // containall + keyboard are within the screen
            // Add padding to containall so that it visually fits the screen
            containallNewPaddingHeight = windowHeight - containall_height
        }
        containall.style.paddingBottom = `${containallNewPaddingHeight - 12}px`
      }, 1000);
  }

let keyboard_default_open = false;

function openFullscreenModal(e) {
    let modal_id;
    let target;

    if (typeof(e) == 'string') {
        modal_id = e
    } else {
        target = e.target
        modal_id = target.getAttribute('for')
    }

    if (modal_id == 'deleteModal') {
        document.getElementById('overlay').classList.add('higher')
    }

    if (modal_id == 'profile_modal' && !user.id) {
        toast(true, 'You need to be logged in to access your profile.')
        return
    }
    
    if (modal_id == 'howToModal') {
        keyboard_default_open = window.getComputedStyle(document.getElementById('keyboard-cont'))['display'] == 'flex'
    }

    let modal = document.getElementById(modal_id)

    modal.classList.add('opened')
    
    if (target?.classList.contains('nav-item')) {
        document.getElementById('sidenav').classList.remove('opened')
    }

    document.getElementById('overlay').classList.remove('closed')
  }

  function closeFullscreenModal(e) { // TODO: close rewards modal takes very long?
    let modal_id;

    if (typeof(e) == 'string') {
        modal_id = e
    } else { // e is event
        let target = e.target
        modal_id = target.getAttribute('for')
    }
    
    let modal = document.getElementById(modal_id)

    modal.classList.remove('opened')

    if (modal_id == 'howToModal') {
        if (keyboard_default_open) {
            keyboard.style.display = 'flex'
        }
        keyboard.style.zIndex = 5
    }

    if (['send_reset_email_modal', 'password_reset_modal', 'deleteModal', 'send_forgot_username_modal'].includes(modal_id)) {
        // if closing reset modal, remove login overlay
        document.getElementById('overlay').classList.remove('higher')
    } else {
        document.getElementById('overlay').classList.add('closed')
    }
    if (modal_id == 'login_modal') { // logging in / creating profile bysteps this function
        not_logging_in = true
        if (puzzle.id) { // if refusing login and puzzle is loaded, send start
            loadPuzzleAndGuesses()
        }
        openFullscreenModal('howToModal')
    }

  }

function logout(e) {
    // Eventually, will delete user_id cookie
    location.reload()
}

function sureDelete(e) {
    openFullscreenModal('deleteModal')
}

async function deleteProfile(e) {
    if (!user.id) {
        toast(true, `You aren't logged in.`)
    } else {
        const params = {
            user_id: user.id
        }
        await fetchPostWrapper('/users/delete', params, null)
        await toast(false, 'Your profile has been successfully deleted.')
        location.reload()
    }
    

}

const ex_inputs = document.getElementsByClassName('ex-input')
for (let i = 0; i < ex_inputs.length; i++) {
    let input = ex_inputs[i]
    input.tabIndex = '-1'

    input.onclick = function(e) {
        keyboard.style.display = 'flex'
        keyboard.style.zIndex = 25
        input.focus()
    }
    input.onblur = function(event) {
        blurred = this
    }
    input.addEventListener('keydown', function myfunc(event) {
        process_input(input, event)
        /*setTimeout(function(){focus_next_letter(input, event)},80)*/
    })
    /* tooltip.addEventListener("pointerleave", (event) => {
        const tooltip = event.target
        const tooltipText = tooltip.firstElementChild
        tooltipText.style.display = 'none'
    }) */
}

function evalTutorial1() {
    const answer = document.getElementById('tutorial-1-answer').innerText
    if (['T','P','H','C'].includes(answer)) {
        document.getElementById('guess_number_a1').classList.add('correct')
        document.getElementById('guess_number_a0').classList.add('correct')
    } else {
        document.getElementById('guess_number_a1').classList.add('wrong')
        document.getElementById('guess_number_a0').classList.add('correct')
    }
}

function evalTutorial2() {
    const answer = document.getElementById('tutorial-2-answer').innerText
    if (['G', 'K', 'R', 'L', 'V', 'D'].includes(answer)) {
        document.getElementById('guess_number_b1').classList.add('correct')
        document.getElementById('guess_number_b0').classList.add('correct')
        document.getElementById('guess_number_b2').classList.add('correct')
    } else {
        document.getElementById('guess_number_b1').classList.add('correct')
        document.getElementById('guess_number_b0').classList.add('correct')
        document.getElementById('guess_number_b2').classList.add('wrong')
    }
}

let tutorial_guesses = 0
function evalTutorial3() {
    tutorial_guesses++
    const a1 = 'WOR' + document.getElementById('tut-3-1').innerText + document.getElementById('tut-3-2').innerText
    const a2 = document.getElementById('tut-3-3').innerText + 'ROW' + document.getElementById('tut-3-4').innerText
    console.log(a1)
    console.log(a2)
    document.getElementById('guess_number_c0').classList.add('correct')
    let correct = false
    if (['WORLD', 'WORMS', 'WORSE', 'WORST', 'WORKS'].includes(a1)) {
        document.getElementById('guess_number_c1').classList.add('correct')

        switch (a1) {
            case 'WORLD':
                if (['CROWD', 'PROWL', 'DROWN', 'GROWL'].includes(a2)) {
                    document.getElementById('guess_number_c2').classList.add('correct')
                    correct = true
                } else {
                    document.getElementById('guess_number_c2').classList.add('wrong')
                }
                break;
            default:
                if (['CROWS', 'BROWS', 'GROWS'].includes(a2)) {
                    document.getElementById('guess_number_c2').classList.add('correct')
                    correct = true
                } else {
                    document.getElementById('guess_number_c2').classList.add('wrong')
                }
                break;
        }

    } else {
        document.getElementById('guess_number_c1').classList.add('wrong')
    }
    const params = {
        user_id: user.id,
        user_ip: user.ip,
        puzzle_id: -1,
        guess_n: tutorial_guesses,
        attempt: 1,
        words: JSON.stringify([correct.toString(), a1, a2])
    }
    fetchPostWrapper('/guesses', params, null)
}


function create_random_ip() {
    const random_ip = Math.random().toString(36).substring(0,15);
    user.ip = random_ip;
    fetchPostWrapper('/visits', {ip: user.ip}, null)
}

document.getElementById('contact_form').addEventListener('submit', sendContactMessage)

async function sendContactMessage(event) {
    event.preventDefault()

    var params = {
        user_id: user.id,
        user_ip: user.ip,
        email: document.getElementById('return_email').value.toLowerCase(),
        message: document.getElementById('contact_message').value
    }

    if (!params.message) {
        toast(true, `Well, you've gotta type something to send...`)
    } else {
        fetchPostWrapper('/contact', params, function() {
            closeFullscreenModal('contactModal')
            toast(false, 'Your message has been sent!')
        })
        
    }
    
}

window.onload = function() {
    readjustContainallPadding()

    document.getElementById('start_playing').addEventListener('click', function() {closeFullscreenModal('howToModal')})

    document.getElementById("tutorial-1-answer-button").addEventListener('click', evalTutorial1)
    document.getElementById('tutorial-2-answer-button').addEventListener('click', evalTutorial2)
    document.getElementById('tutorial-3-answer-button').addEventListener('click', evalTutorial3)
      

    document.getElementById('logout').addEventListener('click', logout)
    document.getElementById('delete_profile').addEventListener('click', sureDelete)
    document.getElementById('yes_delete').addEventListener('click', deleteProfile)
    document.getElementById('do_not_delete').addEventListener('click', () => closeFullscreenModal('deleteModal'))

    document.getElementById('forgot_username_form').addEventListener('submit', requestUsername)
    document.getElementById('send_reset_email_form').addEventListener('submit', requestResetToken)
    document.getElementById('password_reset_form').addEventListener('submit', submitNewPassword)

    document.getElementById('login_modal').classList.add('opened')

    
   
    r.style.setProperty('--pageHeight', `${windowHeight}px`)

    message_banner = document.getElementById('message_banner')

    document.getElementById('pastPuzzlesNavButton').addEventListener('click', (e) => {
        toast(false, `Soon my friends. Soon.`)
    })

    document.getElementById('weeklyChallengeNavButton').addEventListener('click', (e) => {
        toast(false, `Bigger puzzles, bigger rewards. Also bigger wait time D:`)
    })

    document.getElementById('socialNavButton').addEventListener('click', (e) => {
        toast(false, `Maybe you'll want a separate leaderboard with only your friends?`)
    })

    document.getElementById('leaderboardButton').addEventListener('click', (e) => {
        loadUserStats()
    })

    const refresh_guess_button = document.getElementById('refresh_guess')
    refresh_guess_button.addEventListener('click', refreshLastGuess)

    // send load info and IP to db
    fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        user.ip = data.ip
        fetchPostWrapper('/visit', {ip: data.ip}, null, create_random_ip)
    });


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

    const switch_lb_radios = document.getElementsByClassName('switch_lb_radio')
    for (let i = 0; i < switch_lb_radios.length; i++) {
        var radio = switch_lb_radios[i]
        radio.addEventListener('click', changeLeaderboard)
    }
    document.getElementById('easyLBRadio').addEventListener('click', showCheckedLeaderboard)
    document.getElementById('hardLBRadio').addEventListener('click', showCheckedLeaderboard)

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


  document.querySelectorAll('.open-fs-modal-button').forEach(element => {
    element.addEventListener('click', openFullscreenModal)
  });
  document.querySelectorAll('.close-fs-modal-button').forEach(element => {
    element.addEventListener('click', closeFullscreenModal)
  });

  var keyboardbutton = document.getElementById('keyboardbutton')

  

  
  
  // TODO: Clamp total padding based on actual height of puzzle. Padding only needs to be puzzle + keyboard - windowHeight
  // When puzzle is small, I don't need to add the entire keyboard height to the bottom of the puzzle, since the puzzle doesn't reach the bottom of the screen
  keyboardbutton.onclick = function() {
    var keyboard = document.getElementById('keyboard-cont')
    
    if (window.getComputedStyle(keyboard)['display'] == 'none') {
        keyboard.style.display = 'flex'
        //document.getElementById('containall').style.height = 'calc(12rem + var(--pageHeight) + 2rem)'
        // document.getElementById('containall').style.paddingBottom = 'calc(12rem + 2rem)'
        readjustContainallPadding()
    } else {
        keyboard.style.display = 'none'
       // document.getElementById('containall').style.height = 'calc(var(--pageHeight) + 2rem)'
        //document.getElementById('containall').style.paddingBottom = '2rem'
        readjustContainallPadding()
    }
  }

  const keyboard_keys = document.querySelectorAll('.keyboard-button')
  keyboard_keys.forEach((key) => {
    key.onclick = function(event) {
        event.preventDefault();
        let key_val = key.innerText
        if (!key_val) {
            key_val = key.value
        }
        blurred.focus()
        process_input(blurred, key_val)
    }
  })

  
  document.getElementById("answerBtn").onclick = function() {
    process_guess()
  }

  
  
}
