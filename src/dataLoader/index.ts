import { SystemDefinition, ResourceDefinition } from "../types/";
import faker from "faker";

export interface UnknownResourceData {
  [property: string]: unknown;
  state: string;
}

export interface DataLoader {
  create(
    type: string,
    data: Object
  ): Promise<{ uid: string; type: string; data: Object }>;
  read(uid: string, type: string): Promise<UnknownResourceData | undefined>;
  update(uid: string, type: string, data: Object): Promise<boolean>;
  delete(uid: string, type: string, data: Object): Promise<boolean>;

  list(type: string): Promise<Array<{ uid: string; type: string }>>;
}

export class InMemoryDataLoader implements DataLoader {
  data: Map<string, UnknownResourceData> = new Map();
  last_uid = 0;

  definition: SystemDefinition | null = null;

  constructor(definition: SystemDefinition) {
    this.definition = definition;
  }

  /** Change the system definition after an instance has been instantiated.
   *  Use at your own risk.
   */
  loadDefinition(d: SystemDefinition) {
    this.definition = d;
  }

  create(type: string, data: { state: string }) {
    // TODO: Fail if `data` doesn't match the shape of the
    //       object definition.
    const uid = String(++this.last_uid);
    this.data.set(InMemoryDataLoader.makeKey(uid, type), data);
    return Promise.resolve({ uid, type, data });
  }

  read(uid: string, type: string) {
    return Promise.resolve(
      this.data.get(InMemoryDataLoader.makeKey(uid, type))
    );
  }

  update(uid: string, type: string, data: Object) {
    // Fail if this resource doesn't exist
    if (!this.data.has(InMemoryDataLoader.makeKey(uid, type))) {
      return Promise.resolve(false);
    }

    // TODO: Fail if `data` doesn't match the shape of the
    //       object definition.
    this.data.set(InMemoryDataLoader.makeKey(uid, type), {
      ...this.data.get(InMemoryDataLoader.makeKey(uid, type))!,
      ...data
    });

    // Always succeed for now
    return Promise.resolve(true);
  }

  delete(uid: string, type: string, data: Object) {
    // Fail if this resource doesn't exist
    if (!this.data.has(InMemoryDataLoader.makeKey(uid, type))) {
      return Promise.resolve(false);
    }

    // TODO: Fail if `data` doesn't match the shape of the
    //       object definition.
    this.data.delete(InMemoryDataLoader.makeKey(uid, type));

    // Always succeed for now
    return Promise.resolve(true);
  }

  list(type: string) {
    return Promise.resolve(
      Array.from(this.data)
        .filter(
          ([key, value]) => InMemoryDataLoader.parseKey(key).type === type
        )
        .map(([key, value]) => InMemoryDataLoader.parseKey(key))
    );
  }

  static makeKey(uid: string, type: string) {
    return `${type}#${uid}`;
  }
  static parseKey(key: string) {
    const parts = key.split("#");
    return { uid: parts[1], type: parts[0] };
  }
}

export class FakeInMemoryDataLoader extends InMemoryDataLoader {
  constructor(definition: SystemDefinition, nObjects: number) {
    super(definition);

    // Loop through resources and create n fake objects for each
    for (const resourceType in definition.resources) {
      for (let i = 0; i < nObjects; i++) {
        this.data.set(
          InMemoryDataLoader.makeKey(String(++this.last_uid), resourceType),
          FakeInMemoryDataLoader.generateFakeData(
            definition.resources[resourceType]
          )
        );
      }
    }
  }

  static generateFakeData(resource: ResourceDefinition) {
    const out: UnknownResourceData = {
      state:
        resource.defaultState || (resource.states ? resource.states[0] : "")
    };
    for (const propertyName in resource.properties) {
      const def = resource.properties[propertyName];
      let value = null;
      switch (def.type) {
        case "string":
          if (propertyName === "title") {
            value = faker.company.catchPhrase();
          } else if (propertyName === "text") {
            value = faker.lorem.paragraph();
          } else {
            value = faker.lorem.sentence();
          }
          break;
        case "string[]":
          value = new Array(5)
            .fill(faker.random.number(10))
            .map(f => faker.lorem.sentence());
          break;
        case "number":
          value = faker.random.number(1000);
          break;
        case "number[]":
          value = new Array(5)
            .fill(faker.random.number(10))
            .map(f => faker.random.number(1000));
          break;
        case "boolean":
          value = Math.random() < 0.5;
          break;
        case "boolean[]":
          value = new Array(5)
            .fill(faker.random.number(10))
            .map(f => Math.random() < 0.5);
          break;
        case "datetime":
          value = faker.date.recent();
          break;
      }
      out[propertyName] = value;
    }

    return out;
  }
}
