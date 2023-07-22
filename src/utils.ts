import { faker } from "@faker-js/faker";
import { Customer } from "./interfaces";

function randomInt(max: number, min = 0) {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);

  return Math.floor(Math.random() * (maxInt - minInt)) + minInt;
}

function randomIntInclusive(max: number, min = 0) {
  return randomInt(max + 1, min);
}

function createRandomCustomer(): Customer {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    address: {
      line1: faker.location.streetAddress(),
      line2: faker.location.secondaryAddress(),
      postcode: faker.location.zipCode(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.countryCode(),
    },
    createdAt: new Date(),
  };
}

export function createRandomCustomers(): Customer[] {
  return faker.helpers.multiple(createRandomCustomer, {
    count: randomIntInclusive(10, 1),
  });
}
