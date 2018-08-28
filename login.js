const yaml = require('js-yaml');
const fs = require('fs')

const request = require("request")

const readlineSync = require('readline-sync');

const loginUrl = 'https://secure.last.fm/login'

var j = request.jar();

var csrftoken

module.exports = function () {
    console.log("Please enter your last.fm credentials to log in (these will not be stored).")
    var username = readlineSync.question('Username: ');
    var password = readlineSync.question('Password: ', {
        hideEchoBack: true // The typed text on screen is hidden by `*`.
    });

    request.get({ url: loginUrl, jar: j }, function (error, response) {

        csrftoken = response.body.match(/<input[^>]+name='csrfmiddlewaretoken'[^>]+>/g)[0].match(/value='([^']+)'/)[1]
        console.log("Initial CSRF Token extracted:     " + csrftoken)
        console.log("Initial session id:               " + j.getCookies(loginUrl).filter(c => c.key == 'sessionid')[0].value)

        request.post({
            url: loginUrl,
            jar: j,
            gzip: true,
            headers: {
                Referer: loginUrl
            },
            form: {
                username: username,
                password: password,
                csrfmiddlewaretoken: csrftoken
            }
        },
            (error, response, body) => {
                if (response.statusCode == 302) {
                    let cookies = j.getCookies(loginUrl)
                    let csrfCookie = cookies.filter(c => c.key == 'csrftoken')[0] || null
                    let sessionCookie = cookies.filter(c => c.key == 'sessionid')[0] || null
                    if (!csrfCookie) throw new Error('no csrf token found')
                    if (!sessionCookie) throw new Error('no session id token found')
                    console.log("Login CSRF Token extracted:       " + csrfCookie.value)
                    console.log("Login Session ID Token extracted: " + sessionCookie.value)
                    fs.writeFileSync('session.yml', yaml.dump({ csrftoken: csrfCookie.value, sessionid: sessionCookie.value }), 'utf-8')
                    console.log("Login successful, session saved to session.yml")
                } else {
                    console.log("Login Failed")
                    console.log('Response code: ' + response.statusCode)
                    console.log(response.body.match(/<div[^>]+class=['"]alert[^>]+>([^<]+)<\/div>/g).map(html => 'Message: ' + html.match(/>[\\n\W]*([^\\<]+)[^<]*</)[1].trim()))
                }
            })
    })
}