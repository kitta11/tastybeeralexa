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
      .speak('Welcome to our CraftBeer Decision Helper. I will recommend the best craftbeer for you. Do you want me to recommend a beer or you dont prefer beer?')
      .reprompt('Do you want me to recommend a beer or you dont prefer beer?')
      .getResponse();
  },
};

const CouchPotatoIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'CouchPotatoIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Sorry to hear that, in that case we have to say good bye')
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

    const key = `${slotValues.typeImportance.resolved}-${slotValues.bitterness.resolved}-${slotValues.glutenTolerance.resolved}-${slotValues.colorPreference.resolved}`;
    const occupation = options[slotsToOptionsMap[key]];

    const speechOutput = `So your preferred type is ${slotValues.typeImportance.resolved
      }. You like when the beer is ${slotValues.bitterness.resolved
      }, you like ${slotValues.colorPreference.resolved
      }  color and you are ${slotValues.glutenTolerance.resolved
      } to gluten ` +
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
  'glutenTolerance',
  'bitterness',
  'typeImportance',
];

const slotsToOptionsMap = {
  'pilsen-mild-intolerant-pale': 20,
  'pilsen-mild-intolerant-dark': 8,
  'pilsen-mild-tolerant-pale': 1,
  'pilsen-mild-tolerant-dark': 4,
  'pilsen-bitter-intolerant-pale': 10,
  'pilsen-bitter-intolerant-dark': 3,
  'pilsen-bitter-tolerant-pale': 11,
  'pilsen-bitter-tolerant-dark': 13,
  'lager-mild-intolerant-pale': 20,
  'lager-mild-intolerant-dark': 6,
  'lager-mild-tolerant-pale': 19,
  'lager-mild-tolerant-dark': 14,
  'lager-bitter-intolerant-pale': 2,
  'lager-bitter-intolerant-dark': 12,
  'lager-bitter-tolerant-pale': 17,
  'lager-bitter-tolerant-dark': 16,
  'guiness-mild-intolerant-pale': 9,
  'guiness-mild-intolerant-dark': 15,
  'guiness-mild-tolerant-pale': 17,
  'guiness-mild-tolerant-dark': 7,
  'guiness-bitter-intolerant-pale': 17,
  'guiness-bitter-intolerant-dark': 0,
  'guiness-bitter-tolerant-pale': 1,
  'guiness-bitter-tolerant-dark': 5,
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
    CouchPotatoIntent,
    InProgressRecommendationIntent,
    CompletedRecommendationIntent,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
