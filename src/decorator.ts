import "reflect-metadata";
import { OrderByTypeFactory } from './order-by.type-factory';
import { GraphQLType } from "graphql";
const graphql = require("graphql");

export const GQ_QUERY_KEY                   = "gq_query";
export const GQ_MUTATION_KEY                = "gq_mutation";
export const GQ_FIELDS_KEY                  = "gq_fields";
export const GQ_OBJECT_METADATA_KEY         = "gq_object_type";

export interface TypeMetadata {
    name?: string;
    description?: string;
    isNonNull?: boolean;
    isList?: boolean;
    isPagination?: boolean;
    explicitType?: any;
}

export interface ArgumentMetadata extends TypeMetadata {
}

export interface ContextMetadata extends ArgumentMetadata {
    index?: number;
}

export interface RootMetadata extends ContextMetadata {
}

export interface FieldTypeMetadata extends RootMetadata {
    args?: ArgumentMetadata[];
    root?: RootMetadata;
    context?: ContextMetadata;
}

export interface ObjectTypeMetadata {
    name?: string;
    description?: string;
    isInput?: boolean;
}

function createOrSetObjectTypeMetadata(target: any, metadata: ObjectTypeMetadata) {
    if (!Reflect.hasMetadata(GQ_OBJECT_METADATA_KEY, target.prototype)) {
        Reflect.defineMetadata(GQ_OBJECT_METADATA_KEY, metadata, target.prototype);
    } else {
        const originalMetadata = Reflect.getMetadata(GQ_OBJECT_METADATA_KEY, target.prototype) as ObjectTypeMetadata;
        Object.assign(originalMetadata, metadata);
    }
}

export interface FieldOption {
    type?: any;
}

export interface ArgumentOption {
    name: string;
    type?: any;
}

function createOrSetFieldTypeMetadata(target: any, metadata: FieldTypeMetadata) {
    let fieldDefs: FieldTypeMetadata[];
    if (!Reflect.hasMetadata(GQ_FIELDS_KEY, target)) {
        fieldDefs = [];
        Reflect.defineMetadata(GQ_FIELDS_KEY, fieldDefs, target);
    } else {
        fieldDefs = Reflect.getMetadata(GQ_FIELDS_KEY, target);
    }
    const def = fieldDefs.find(def => def.name === metadata.name);
    if (!def) {
        fieldDefs.push(metadata);
    } else {
        let args: ArgumentMetadata[] = def.args;
        if (metadata.args && metadata.args.length) {
            if (!def.args) {
                args = metadata.args;
            } else {
                args = Object.assign([], def.args, metadata.args);
            }
        } 
        Object.assign(def, metadata);
        def.args = args;
    }
}

export function getFieldMetadata(target: any, name: string) {
    if (!Reflect.hasMetadata(GQ_FIELDS_KEY, target)) {
        return null;
    }
    return (<FieldTypeMetadata[]>Reflect.getMetadata(GQ_FIELDS_KEY, target)).find(m => m.name === name);
}

function setArgumentMetadata(target: any, propertyKey: any, index: number, metadata: ArgumentMetadata) {
    const fieldMetadata = getFieldMetadata(target, propertyKey);
    if (fieldMetadata && fieldMetadata.args && fieldMetadata.args[index]) {
        Object.assign(fieldMetadata.args[index], metadata);
    } else {
        const args: ArgumentMetadata[] = [];
        args[index] = metadata;
        createOrSetFieldTypeMetadata(target, {
            name: propertyKey,
            args,
        });
    }
}

function setContextMetadata(target: any, propertyKey: any, index: number, metadata: ContextMetadata) {
    const fieldMetadata = getFieldMetadata(target, propertyKey);
    if (fieldMetadata && fieldMetadata.context) {
        Object.assign(fieldMetadata.context, true);
    } else {
        createOrSetFieldTypeMetadata(target, { 
            name: propertyKey,
            context: { index: index }
        });
    }
}

function setRootMetadata(target: any, propertyKey: any, index: number, metadata: ContextMetadata) {
    const fieldMetadata = getFieldMetadata(target, propertyKey);
    if (fieldMetadata && fieldMetadata.root) {
        Object.assign(fieldMetadata.root, metadata);
    } else {
        createOrSetFieldTypeMetadata(target, { 
            name: propertyKey,
            root: { index: index }
        });
    }
}

export function ObjectType() {
    return function(target: any) {
        createOrSetObjectTypeMetadata(target, {
            name: target.name,
            isInput: false,
        });
    } as Function;
}

export function InputObjectType() {
    return function(target: any) {
        createOrSetObjectTypeMetadata(target, {
            name: target.name,
            isInput: true,
        });
    } as Function;
}

export function Field(option?: FieldOption) {
    return function(target: any, propertyKey: any) {
        createOrSetFieldTypeMetadata(target, {
            name: propertyKey,
            explicitType: option && option.type,
        });
    } as Function;
}

export function NonNull() {
    return function(target: any, propertyKey: any, index?: number) {
        if (index >= 0) {
            setArgumentMetadata(target, propertyKey, index, {
                isNonNull: true,
            });
        } else {
            createOrSetFieldTypeMetadata(target, {
                name: propertyKey,
                isNonNull: true,
            });
        }
    } as Function;
}

export function Pagination() {
    return function(target: any, propertyKey: any, index?: number) {
        if (index >= 0) {
            setArgumentMetadata(target, propertyKey, index, {
                isPagination: true,
            });
        } else {
            createOrSetFieldTypeMetadata(target, {
                name: propertyKey,
                isPagination: true,
            });
        }
    } as Function;
}

export function List() {
    return function(target: any, propertyKey: any, index?: number) {
        if (index >= 0) {
            setArgumentMetadata(target, propertyKey, index, {
                isList: true,
            });
        } else {
            createOrSetFieldTypeMetadata(target, {
                name: propertyKey,
                isList: true,
            });
        }
    } as Function;
}

export function Arg(option: ArgumentOption) {
    return function(target: any, propertyKey: any, index: number) {
        setArgumentMetadata(target, propertyKey, index, {
            name: option.name,
            explicitType: option.type,
        });
    } as Function;
}

export function Root() {
    return function(target: any, propertyKey: any, index: number) {
        setRootMetadata(target, propertyKey, index, { });
    } as Function;
}

export function Ctx() {
    return function(target: any, propertyKey: any, index: number) {
        setContextMetadata(target, propertyKey, index, { });
    } as Function;
}

export function OrderBy() {
    return function(target: any, propertyKey: any, index: number) {
        setArgumentMetadata(target, propertyKey, index, {
            name: "orderBy"
        });
    } as Function;
}

export function Description(body: string) {
    return function(target: any, propertyKey?: any, index?: number) {
        if (index >= 0) {
            setArgumentMetadata(target, propertyKey, index, {
                description: body,
            });
        } else if (propertyKey) {
            createOrSetFieldTypeMetadata(target, {
                name: propertyKey,
                description: body,
            });
        } else {
            createOrSetObjectTypeMetadata(target, {
                description: body,
            });
        }
    } as Function;
}

export function Query(option?: any) {
    return function(target: any, propertyKey: any) {
        if (Reflect.hasMetadata(GQ_QUERY_KEY, target)) {
            let metadata = Reflect.getMetadata(GQ_QUERY_KEY, target);
            metadata.push(propertyKey)
            Reflect.defineMetadata(GQ_QUERY_KEY, metadata, target);
        } else {
            Reflect.defineMetadata(GQ_QUERY_KEY, [ propertyKey ], target);
        }
    } as Function;
}

export function Mutation(option?: any) {
    return function(target: any, propertyKey: any) {
        if (Reflect.hasMetadata(GQ_MUTATION_KEY, target)) {
            let metadata = Reflect.getMetadata(GQ_MUTATION_KEY, target);
            metadata.push(propertyKey)
            Reflect.defineMetadata(GQ_MUTATION_KEY, metadata, target);
        } else {
            Reflect.defineMetadata(GQ_MUTATION_KEY, [ propertyKey ], target);
        }
    } as Function;
}

export function Schema() {
    return function(target: Function) {
        Reflect.defineMetadata("gq_schema", {}, target);
    } as Function;
}
