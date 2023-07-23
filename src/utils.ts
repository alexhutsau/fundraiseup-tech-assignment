import { faker } from "@faker-js/faker";
import { Customer } from "./interfaces";
import { WithId } from "mongodb";
import Hashids from "hashids";

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

export function createRandomCustomers(max: number, min = 1): Customer[] {
  return faker.helpers.multiple(createRandomCustomer, { count: { max, min } });
}

function anonymiseString(value: string): string {
  return new Hashids(value, 8).encode(1);
}

function anonymiseEmail(email: string): string {
  const atSignIndex = email.indexOf("@");
  return `${anonymiseString(email.slice(0, atSignIndex))}@${email.slice(
    atSignIndex + 1,
  )}`;
}

export function anonymiseCustomer({
  address,
  ...customer
}: WithId<Customer>): WithId<Customer> {
  return {
    ...customer,
    firstName: anonymiseString(customer.firstName),
    lastName: anonymiseString(customer.lastName),
    email: anonymiseEmail(customer.email),
    address: {
      ...address,
      line1: anonymiseString(address.line1),
      line2: anonymiseString(address.line2),
      postcode: anonymiseString(address.postcode),
    },
  };
}
