const sumbitbutton = document.getElementById("submit")
const logoffbutton = document.getElementById("logoff")

let user
let password

let token

let g1top = 440
let g1right = 850
let g1bot = 40
let g1left = 100


sumbitbutton.addEventListener('click', CheckLogin)
logoffbutton.addEventListener('click', LogOff)

function authenticateUser(user, password)
{
    var Login = user + ":" + password;
    hash = btoa(unescape(encodeURIComponent(Login))); 
    return "Basic " + hash;
}

function CheckLogin(){

    user = document.getElementById("UserName").value
    password = document.getElementById("Password").value
    

    GetToken() 
}

function GetToken() {

    var request = new XMLHttpRequest();
    request.open("POST", "https://01.kood.tech/api/auth/signin", false);
    request.setRequestHeader("Authorization", authenticateUser(user, password));  
    request.send();
    
    
    if(request.status != 200){
        alert("Error: Wrong Password or Username!")
    }else{
        token = JSON.parse(request.responseText);
        Login()
    }
}


async function Login(){
    const login= document.querySelector(".login")
    login.style.display = "none"
    const profile = document.querySelector(".profile")
    profile.style.display = "block"
    const graphs = document.querySelector(".graphs")
    graphs.style.display = "block"

    let userobject = await getdata(
        `query{
            user{
                attrs
            }
        }`
    )

    let userinfo = userobject.data.user[0].attrs

    setInnerText("firstName", userinfo.firstName)
    setInnerText("lastName", userinfo.lastName)
    setInnerText("email", userinfo.email)

    let taskobject = await getdata(
        `query{
            transaction(
                where: {
                  type: { _eq: "xp"}
                  path:{ _nlike: "%piscine%"}
                },
                order_by: { createdAt: desc }
              ) {
                id
                type
                amount
                userId
                attrs
                createdAt
                path
              }
        }`
    )


    taskinfo = taskobject.data.transaction

    let [tasks, totalxp]= countXPnTasks(taskinfo)
    setInnerText("totalxp",totalxp/1000 + " kb")
    setInnerText("comptasks",tasks)

    
    

    if(tasks>0){
       let[months,datearr,taskarr,xparr,firstmonth, firstyear] = getTaskDatesnXp(taskinfo)
       createXpGraph(months,datearr,taskarr,xparr,firstmonth,totalxp,firstyear)

       createAuditGraph()
    }
    

}


function getdata(query){

    return fetch("https://01.kood.tech/api/graphql-engine/v1/graphql",{
        method:"POST",
        headers:{"Content-type":"application/json", "Authorization":"Bearer " + token},
        body: JSON.stringify({
            query: query

         })
        
    })
    .then(res => res.json())
    
}

function setInnerText(element, text){
    document.getElementById(element).innerText =document.getElementById(element).innerText + " "+ text
}

function countXPnTasks(taskobj){
    let xp = 0
    let tasks = 0
    Object.keys(taskobj).forEach(key => { 
        xp += taskobj[key].amount
        tasks += 1
    })
    return [tasks, xp]
}

function getTaskDatesnXp(taskobj){
    
    let latesttask = taskobj[0].createdAt.split("-")
    let firstask = taskobj[Object.keys(taskobj).length-1].createdAt.split("-")

    let years = latesttask[0]-firstask[0]-1

    let months = 12-parseInt(firstask[1]) + parseInt(latesttask[1]) + years * 12

    let datearr = []
    let taskarr = []
    let xparr = []

    Object.keys(taskobj).forEach(key => { 
        datearr.push(taskobj[key].createdAt.slice(0, 10))
        taskarr.push(taskobj[key].path.slice(14))
        xparr.push(taskobj[key].amount)
    })

    return[months, datearr, taskarr, xparr, parseInt(firstask[1]), parseInt(firstask[0])]
}

function createXpGraph(months,datearr,taskarr,xparr, firstmonth, totalxp, firstyear){
    let allmonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov","Dec"]
    let onestepx = g1right/months
    let xxpos=g1left
    let xypos=g1top
    let month=firstmonth-2
    let year = firstyear

    //x axis labels
    for (let i = 0; i <= months; i++) {
        month++
        if(month>=12){
            month = 0
            let years = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            years.innerHTML = year
            year++
            years.setAttribute('x', xxpos)
            years.setAttribute('y', xypos+60)
            document.getElementById("xlabels").appendChild(years)
        }
        let x = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        x.innerHTML = allmonths[month] 
        x.setAttribute('x', xxpos)
        x.setAttribute('y', xypos+40)
        document.getElementById("xlabels").appendChild(x)

        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', xxpos)
        line.setAttribute('y1', g1bot-100)
        line.setAttribute('x2', xxpos)
        line.setAttribute('y2', g1top+20)
        document.getElementById("xGrid").appendChild(line)
        xxpos += onestepx
        
    }

    let onestepy = g1top/(totalxp/100000)
    let yxpos=g1left-20
    let yypos=g1top+20

    for (let i = 0; i < totalxp/100000; i++) {
        let y = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        y.innerHTML = 100 * i
        y.setAttribute('x', yxpos)
        y.setAttribute('y', yypos+5)
        document.getElementById("ylabels").appendChild(y)

        
        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', g1left)
        line.setAttribute('y1', yypos)
        line.setAttribute('x2', g1right+150)
        line.setAttribute('y2', yypos)
        document.getElementById("yGrid").appendChild(line)
        yypos -= onestepy
        
    }
    let prevdate = 0
    let tempxp = 0

    let prevl

    for (let i = 0; i < taskarr.length; i++) {

        if(datearr[i].slice(0,7) == prevdate){
            tempxp += xparr[xparr.length-i-1]
            prevl.innerHTML += ", "+ taskarr[i]
            
        }else{
            tempxp += xparr[xparr.length-i-1]

            prevdate = datearr[i].slice(0,7)
            tempdate = datearr[0].split("-")
            tempdate1 = datearr[i].split("-")

            let years = tempdate[0]-tempdate1[0]-1
            let diff = 12-parseInt(tempdate1[1]) + parseInt(tempdate[1]) + years * 12

            let cr = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

            let xpos = (onestepx * diff)+g1left
            let ypos = (-onestepy*(tempxp/100000)+g1top+20)
        
            cr.setAttribute('cx', xpos)
            cr.setAttribute('cy', ypos)
            cr.setAttribute('r','4')

            document.getElementById("data").appendChild(cr)

            let l = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            l.innerHTML = taskarr[taskarr.length-i-1]
            l.setAttribute('x', xpos)
            l.setAttribute('y', ypos)
            l.style.height = "100px"
            l.classList.add("datalabel")
            if(i>taskarr.length/2){    
                l.setAttribute('text-anchor',"end")
            }
            document.getElementById("data").appendChild(l)
            prevl = l

        }
        //<circle cx="90" cy="192" data-value="7.2" r="4"></circle>
        
        
        
    }
    
}

async function createAuditGraph(){
    let audup = await getdata(
        `query{
            transaction(
                where: {
                    type: { _eq: "up"}
                  path:{ _nlike: "%piscine%"}
                }){
                type
                path
              }
        }`
    )
    let auddown = await getdata(
        `query{
            transaction(
                where: {
                    type: { _eq: "down"}
                  path:{ _nlike: "%piscine%"}
                }){
                type
                path
              }
        }`
    )
    let up = audup.data.transaction
    let down = auddown.data.transaction

    let upsum = 0
    let downsum = 0
    Object.keys(up).forEach(key => { 
        upsum++
    })
    Object.keys(down).forEach(key => { 
        downsum++
    })
    document.getElementById("up").innerHTML = upsum
    document.getElementById("down").innerHTML = downsum

    let totalaudits = upsum+downsum

    document.getElementById("totalaudits").innerHTML += " " +totalaudits

    let precent1 = upsum/totalaudits * 100
    let precent2 = 100-precent1
    let uph= precent1*5
    let downh =precent2*5

    document.getElementById("uprec").setAttribute("height", uph)
    document.getElementById("uprec").setAttribute("y", 500-uph)
    document.getElementById("downrec").setAttribute("height", downh)
    document.getElementById("downrec").setAttribute("y", 500-downh)
    document.getElementById("up").setAttribute("y", 500-uph/2)
    document.getElementById("down").setAttribute("y", 500-downh/2)
    
}

function LogOff(){
    const login= document.querySelector(".login")
    login.style.display = "block"
    const profile = document.querySelector(".profile")
    profile.style.display = "none"
    const graphs = document.querySelector(".graphs")
    graphs.style.display = "none"

    location.reload();


    

}


