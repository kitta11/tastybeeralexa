/**

    Copyright 2017-2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
    Licensed under the Amazon Software License (the "License").
    You may not use this file except in compliance with the License.
    A copy of the License is located at
      http://aws.amazon.com/asl/
    or in the "license" file accompanying this file. This file is distributed
    on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express
    or implied. See the License for the specific language governing
    permissions and limitations under the License.

    This skill demonstrates how to use Dialog Management to delegate slot
    elicitation to Alexa. For more information on Dialog Directives see the
    documentation: https://developer.amazon.com/docs/custom-skills/dialog-interface-reference.html

    This skill also uses entity resolution to define synonyms. Combined with
    dialog management, the skill can ask the user for clarification of a synonym
    is mapped to two slot values.
 **/

/* eslint-disable  func-names */
/* eslint-disable  no-restricted-syntax */
/* eslint-disable  no-loop-func */
/* eslint-disable  consistent-return */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Welcome to our CraftBeer Decision Helper. Based on your preferences I will recommend the best craftbeer for you. Can we start or you just want me to surprise you with a random beer?')
      .reprompt('Do you want me to recommend a beer based on your answers or you just want a surprise one?')
      .getResponse();
  },
};

const SurprisemeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'SurprisemeIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Everybody loves MATAHARI. Are you satisfied with it or you want me to recommend a beer for you?')
      .getResponse();
  },
};

const InProgressRecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent'
      && request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    let prompt = '';

    for (const slotName of Object.keys(handlerInput.requestEnvelope.request.intent.slots)) {
      const currentSlot = currentIntent.slots[slotName];
      if (currentSlot.confirmationStatus !== 'CONFIRMED'
        && currentSlot.resolutions
        && currentSlot.resolutions.resolutionsPerAuthority[0]) {
        if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
          if (currentSlot.resolutions.resolutionsPerAuthority[0].values.length > 1) {
            prompt = 'What would you choose?';
            const size = currentSlot.resolutions.resolutionsPerAuthority[0].values.length;

            currentSlot.resolutions.resolutionsPerAuthority[0].values
              .forEach((element, index) => {
                prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
              });

            prompt += '?';

            return handlerInput.responseBuilder
              .speak(prompt)
              .reprompt(prompt)
              .addElicitSlotDirective(currentSlot.name)
              .getResponse();
          }
        } else if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
          if (requiredSlots.indexOf(currentSlot.name) > -1) {
            prompt = `What ${currentSlot.name} do you prefer`;

            return handlerInput.responseBuilder
              .speak(prompt)
              .reprompt(prompt)
              .addElicitSlotDirective(currentSlot.name)
              .getResponse();
          }
        }
      }
    }

    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  },
};

const CompletedRecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent'
      && request.dialogState === 'COMPLETED';
  },
  handle(handlerInput) {
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

    const slotValues = getSlotValues(filledSlots);

    const key = `${slotValues.alcoholLevel.resolved}-${slotValues.bitterness.resolved}-${slotValues.fruitiness.resolved}-${slotValues.colorPreference.resolved}`;
    const occupation = options[slotsToOptionsMap[key]];

    const speechOutput = `So you wanna be ${slotValues.alcoholLevel.resolved
      } wasted. You like when the beer is ${slotValues.bitterness.resolved
      }, you like ${slotValues.colorPreference.resolved
      }  color and you are a ${slotValues.fruitiness.resolved
      } person ` +
      `. So I recommend you the ${occupation.name}`;

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('This is CraftBeer Decision Helper. I can help you find the perfect craftbeer match. You can say, recommend a beer.')
      .reprompt('Do you like beer?')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Bye')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};


const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/* CONSTANTS */

const skillBuilder = Alexa.SkillBuilders.custom();

const requiredSlots = [
  'colorPreference',
  'fruitiness',
  'bitterness',
  'alcoholLevel',
];

const slotsToOptionsMap = {
  'lightly-mild-fruity-pale': 20,
  'lightly-mild-fruity-dark': 8,
  'lightly-mild-notfruity-pale': 1,
  'lightly-mild-notfruity-dark': 4,
  'lightly-bitter-fruity-pale': 10,
  'lightly-bitter-fruity-dark': 3,
  'lightly-bitter-notfruity-pale': 11,
  'lightly-bitter-notfruity-dark': 13,
  'medium-mild-fruity-pale': 20,
  'medium-mild-fruity-dark': 6,
  'medium-mild-notfruity-pale': 19,
  'medium-mild-notfruity-dark': 14,
  'medium-bitter-fruity-pale': 2,
  'medium-bitter-fruity-dark': 12,
  'medium-bitter-notfruity-pale': 17,
  'medium-bitter-notfruity-dark': 16,
  'very-mild-fruity-pale': 9,
  'very-mild-fruity-dark': 15,
  'very-mild-notfruity-pale': 17,
  'very-mild-notfruity-dark': 7,
  'very-bitter-fruity-pale': 17,
  'very-bitter-fruity-dark': 0,
  'very-bitter-notfruity-pale': 1,
  'very-bitter-notfruity-dark': 5,
};

const options = [
  { name: 'Doppelbock', description: '' },
  { name: 'Gyümölcsös Bambi Málna', description: '' },
  { name: 'Black Bulls Dream', description: '' },
  { name: 'VÖRÖS CSEPEL', description: '' },
  { name: 'TriplaX', description: '' },
  { name: 'TRIPLAMEGGY', description: '' },
  { name: 'Snakebite Imperial IPA', description: '' },
  { name: 'BRETTANNIA BRUT', description: '' },
  { name: 'Sixfingers Weisse', description: '' },
  { name: 'Brutal Bitter', description: '' },
  { name: 'Black Jack IPA', description: '' },
  { name: 'Reeporter', description: '' },
  { name: 'Gyümölcsös Áfonya', description: '' },
  { name: 'BullDozer', description: '' },
  { name: 'GAME OVER', description: '' },
  { name: 'Pokerface Pale Ale', description: '' },
  { name: 'Diesel', description: '' },
  { name: 'REDX', description: '' },
  { name: 'Legenda Pony', description: '' },
  { name: 'Jokerface IPA', description: '' },
  { name: 'James’ Brown Ale', description: '' },
];

/* HELPER FUNCTIONS */

function getSlotValues(filledSlots) {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;

    if (filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            isValidated: true,
          };
          break;
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].value,
            isValidated: false,
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        synonym: filledSlots[item].value,
        resolved: filledSlots[item].value,
        isValidated: false,
      };
    }
  }, this);

  return slotValues;
}

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    SurprisemeIntent,
    InProgressRecommendationIntent,
    CompletedRecommendationIntent,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
