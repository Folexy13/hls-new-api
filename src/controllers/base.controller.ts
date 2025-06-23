
import { IController } from '../types/types';
import type { Container } from 'inversify';

export abstract class BaseController implements IController {
  constructor(public container: Container) {}
}
