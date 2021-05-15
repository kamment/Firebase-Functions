const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch=require("node-fetch")
admin.initializeApp();
const db = admin.firestore();


function add(accumulator, a) {
    return accumulator + a;
}

exports.newUserSignUp = functions.auth.user().onCreate((user) => {
 // Función para setear información en BD a la creación de un usuario
  db.collection("Users").doc(user.uid).set({
    createdAt: new Date(user.metadata.creationTime),
    followers: 0,
    follows: 0,
    interestCategories: [],
    numReviews: 0,
    userName: "",
    userPhoto: "",
    email: user.email,
    rankUser: "Bronze",
  });
});

exports.UpdateUpponReview = functions.firestore.document('Reviews/{id}').onCreate(async (snap, context) => {
    var data=snap.data()
    const placeid=data.placeid;
  const dataPlace= await db.collection("Places").doc(placeid).get()
  const numReviewsPlace= dataPlace.data().numReviews



  const dataUser= await db.collection("Users").doc(data.userid).get()
  const numReviewsUser= dataUser.data().numReviews

  console.log(numReviewsPlace,numReviewsPlace)
  db.collection("Users").doc(data.userid).update({
    numReviews: numReviewsUser +1,
  });

  const reviewsdata=await db.collection("Reviews").where("placeid", "==", placeid).get()
  const scores=reviewsdata.docs.map((review)=>{return review.data().rank})
  const n=scores.length;
  console.log(scores,n)

  const sum=scores.reduce(add, 0); 

  const avg=sum/n;
  console.log(avg)
  db.collection("Places").doc(placeid).update({
    numReviews: n,
    avgRating: avg,
  });
});


//Notificación cuanto te sigue un usuario
exports.FollowNotification = functions.firestore.document('Users/{user_id}/Followers/{follower_id}').onCreate(async (snapshot, context) => {
  const data = snapshot.data()
  const user_id = context.params.user_id
  //const follower_id = context.follower_id
  const follower_name = data.username
  
  const userInfo=await db.collection("Users").doc(user_id).get()
  const userData = userInfo.data()
  const tokenPhone = userData.tokenPhone

  //Notificacion
  const message = {
    "to": tokenPhone,
    "body": `Te ha seguido ${follower_name}`,
    "title":"Nuevo Seguidor"
  }

  fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Accept": "application/Json",
      "Content-Type":"application/json"
    },
    body:JSON.stringify(message)
  }
  ).then((res) => {
    console.log(res)
    console.log("sended!!")
  }).catch((err)=>{console.log(err)})
})
